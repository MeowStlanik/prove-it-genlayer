from tests.direct.conftest import confirm, deploy_draft, submit


def _assessment(*pairs):
    return {
        "submissions": [
            {"id": submission_id, "items": [], "score": score, "summary": "ok"}
            for submission_id, score in pairs
        ]
    }


def _two_submissions(vm, direct_deploy, owner, alice, bob, mode):
    contract = deploy_draft(vm, direct_deploy, owner, mode=mode)
    confirm(vm, contract, owner)
    submit(vm, contract, alice, "proof_1", "a")
    vm.warp("2026-01-01T00:05:00Z")
    submit(vm, contract, bob, "proof_2", "b")
    challenge = contract.challenges["article_challenge"]
    submissions = [
        contract.submissions[contract._submission_key("article_challenge", "proof_1")],
        contract.submissions[contract._submission_key("article_challenge", "proof_2")],
    ]
    return contract, challenge, submissions


def test_first_pass_prefers_earliest_eligible(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract, challenge, submissions = _two_submissions(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, "FIRST_PASS"
    )
    verdict = contract._resolve(challenge, _assessment(("proof_1", 75), ("proof_2", 95)), submissions)
    assert verdict["payouts"][0]["submission_id"] == "proof_1"


def test_best_at_deadline_prefers_highest_score(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract, challenge, submissions = _two_submissions(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, "BEST_AT_DEADLINE"
    )
    verdict = contract._resolve(challenge, _assessment(("proof_1", 75), ("proof_2", 95)), submissions)
    assert verdict["payouts"][0]["submission_id"] == "proof_2"


def test_best_at_deadline_tie_breaks_by_time(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract, challenge, submissions = _two_submissions(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, "BEST_AT_DEADLINE"
    )
    verdict = contract._resolve(challenge, _assessment(("proof_1", 90), ("proof_2", 90)), submissions)
    assert verdict["payouts"][0]["submission_id"] == "proof_1"


def test_split_preserves_entire_pool(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract, challenge, submissions = _two_submissions(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, "SPLIT"
    )
    verdict = contract._resolve(challenge, _assessment(("proof_1", 80), ("proof_2", 100)), submissions)
    assert len(verdict["payouts"]) == 2
    assert sum(item["amount"] for item in verdict["payouts"]) == int(challenge.pool)


def test_no_submission_below_threshold_is_paid(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract, challenge, submissions = _two_submissions(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, "SPLIT"
    )
    verdict = contract._resolve(challenge, _assessment(("proof_1", 10), ("proof_2", 40)), submissions)
    assert verdict["payouts"] == []
