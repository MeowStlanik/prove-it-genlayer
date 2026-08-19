import json

from tests.direct.conftest import (
    DEADLINE,
    assessment_result,
    confirm,
    deploy_draft,
    register_judge_mocks,
    submit,
)


def test_contract_indexes_challenges_and_submissions(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)

    assert contract.get_challenge_ids() == ["article_challenge"]
    assert contract.get_submission_ids("article_challenge") == ["proof_1"]


def test_required_criterion_is_a_hard_gate_even_above_score_threshold(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    custom_checklist = json.dumps(
        {
            "checklist": [
                {
                    "id": "must",
                    "criterion": "The immutable proof contains the mandatory public deliverable.",
                    "weight": 20,
                    "kind": "REQUIRED",
                },
                {
                    "id": "quality",
                    "criterion": "The deliverable demonstrates exceptional technical depth and clarity.",
                    "weight": 80,
                    "kind": "QUALITY",
                },
            ],
            "unverifiable": [],
        },
        sort_keys=True,
    )
    contract = deploy_draft(
        direct_vm,
        direct_deploy,
        direct_alice,
        mode="FIRST_PASS",
        min_score=70,
        response=custom_checklist,
    )
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    challenge = contract.challenges["article_challenge"]
    submission = contract.submissions[contract._submission_key("article_challenge", "proof_1")]
    verdict = contract._resolve(
        challenge,
        {
            "submissions": [
                {
                    "id": "proof_1",
                    "items": [
                        {"id": "must", "status": "NOT_MET", "evidence": "Missing."},
                        {"id": "quality", "status": "MET", "evidence": "Strong."},
                    ],
                    "score": 80,
                    "summary": "High quality but mandatory deliverable is missing.",
                }
            ]
        },
        [submission],
    )

    assert verdict["payouts"] == []
    assert verdict["ranking"][0]["score"] == 80
    assert verdict["ranking"][0]["required_met"] is False
    assert verdict["ranking"][0]["eligible"] is False


def test_unverifiable_assessment_holds_funds_for_retry(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice, mode="FIRST_PASS")
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.clear_mocks()
    register_judge_mocks(
        direct_vm,
        assessment_result(score=60, published="MET", depth="UNVERIFIABLE"),
    )
    contract.judge("article_challenge")

    challenge = contract.get_challenge("article_challenge")
    assert challenge["status"] == "RETRYABLE"
    assert challenge["verdict"]["payouts"] == []
    assert challenge["verdict"]["reason"] == "UNVERIFIABLE_EVIDENCE"


def test_expired_empty_challenge_opens_refunds(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    direct_vm.warp("2026-01-01T01:00:01Z")

    contract.expire_challenge("article_challenge")
    challenge = contract.get_challenge("article_challenge")
    assert challenge["status"] == "REFUNDABLE"
    assert challenge["verdict"]["reason"] == "EXPIRED_WITHOUT_SETTLEMENT"


def test_expired_challenge_with_submissions_observes_grace_period(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.warp("2026-01-01T01:00:01Z")

    with direct_vm.expect_revert("adjudication grace period is still open"):
        contract.expire_challenge("article_challenge")

    direct_vm.warp("2026-01-08T01:00:01Z")
    contract.expire_challenge("article_challenge")
    assert contract.get_challenge("article_challenge")["status"] == "REFUNDABLE"


def test_expiry_timestamp_is_exposed_for_clients(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    challenge = contract.get_challenge("article_challenge")
    assert challenge["expiry_at"] == DEADLINE + 7 * 24 * 60 * 60
