import json
import pytest

from tests.direct.conftest import (
    assessment_result,
    confirm,
    deploy_draft,
    register_judge_mocks,
    register_draft_mocks,
    submit,
)


def test_native_rubric_consensus_accepts_faithful_proposal(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    challenge = contract.get_challenge("article_challenge")
    assert len(challenge["checklist"]) == 2
    assert sum(item["weight"] for item in challenge["checklist"]) == 100


def test_native_rubric_consensus_rejects_malformed_result(direct_vm, direct_deploy, direct_alice):
    with pytest.raises(Exception):
        deploy_draft(direct_vm, direct_deploy, direct_alice, response=json.dumps({"checklist": []}))


def test_native_assessment_consensus_accepts_supported_proposal(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice, mode="FIRST_PASS")
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.clear_mocks()
    register_judge_mocks(direct_vm)
    contract.judge("article_challenge", json.dumps(["proof_1"]))
    assert contract.get_challenge("article_challenge")["verdict"]["assessment"][0]["score"] == 60


def test_native_assessment_consensus_rejects_malformed_result(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice, mode="FIRST_PASS")
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.clear_mocks()
    register_judge_mocks(direct_vm, json.dumps({"submissions": []}))
    with pytest.raises(Exception):
        contract.judge("article_challenge", json.dumps(["proof_1"]))


def test_native_assessment_consensus_rejects_hallucinating_anchor(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice, mode="FIRST_PASS")
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    bad = json.loads(assessment_result())
    bad["submissions"][1]["items"][0]["status"] = "MET"
    bad["submissions"][1]["score"] = 60
    direct_vm.clear_mocks()
    register_judge_mocks(direct_vm, json.dumps(bad))
    with pytest.raises(Exception):
        contract.judge("article_challenge", json.dumps(["proof_1"]))


def test_failed_threshold_becomes_refundable(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice, mode="FIRST_PASS", min_score=70)
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.clear_mocks()
    register_judge_mocks(direct_vm, assessment_result(score=60))
    contract.judge("article_challenge", json.dumps(["proof_1"]))
    challenge = contract.get_challenge("article_challenge")
    assert challenge["status"] == "REFUNDABLE"
    assert challenge["verdict"]["payouts"] == []
