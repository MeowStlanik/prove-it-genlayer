import json

from tests.direct.conftest import (
    CONTRACT,
    DEADLINE,
    POOL,
    address_hex,
    checklist_result,
    confirm,
    deploy_draft,
    register_draft_mocks,
    submit,
)


def test_draft_stores_consensus_checklist(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    challenge = contract.get_challenge("article_challenge")
    assert challenge["status"] == "DRAFT"
    assert challenge["pool"] == 0
    assert len(challenge["checklist"]) == 2
    assert sum(item["weight"] for item in challenge["checklist"]) == 100


def test_unverifiable_rule_requires_revision(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(
        direct_vm,
        direct_deploy,
        direct_alice,
        response=checklist_result(["Private analytics cannot be verified from the proof snapshot."]),
    )
    challenge = contract.get_challenge("article_challenge")
    assert challenge["status"] == "NEEDS_REVISION"
    with direct_vm.expect_revert("challenge is not confirmable"):
        confirm(direct_vm, contract, direct_alice)


def test_only_creator_can_confirm(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("only challenge creator"):
        confirm(direct_vm, contract, direct_bob)


def test_confirm_opens_funded_challenge(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    challenge = contract.get_challenge("article_challenge")
    assert challenge["status"] == "OPEN"
    assert challenge["pool"] == POOL


def test_confirm_rejects_dust_pool(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("initial pool must be at least 0.001 GEN"):
        confirm(direct_vm, contract, direct_alice, value=1)


def test_confirm_rejects_expired_draft(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    direct_vm.warp("2026-01-01T01:00:01Z")
    with direct_vm.expect_revert("challenge deadline passed"):
        confirm(direct_vm, contract, direct_alice)


def test_funding_is_accounted_per_address(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    direct_vm.value = POOL // 2
    contract.fund("article_challenge")
    direct_vm.value = 0
    assert contract.get_challenge("article_challenge")["pool"] == POOL + POOL // 2
    assert contract.contribution_of("article_challenge", address_hex(direct_bob)) == POOL // 2


def test_funding_rejects_expired_challenge(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    direct_vm.warp("2026-01-01T01:00:01Z")
    direct_vm.sender = direct_bob
    direct_vm.value = POOL // 2
    with direct_vm.expect_revert("challenge deadline passed"):
        contract.fund("article_challenge")


def test_submission_records_immutable_snapshot(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    proof = contract.get_submission("article_challenge", "proof_1")
    assert "/0123456789abcdef0123456789abcdef01234567/" in proof["snapshot_uri"]
    assert len(proof["snapshot_sha256"]) == 64


def test_submission_rejects_mutable_or_unhashed_proof(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    confirm(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("snapshot_uri must be a pinned GitHub, IPFS, or Arweave https URL"):
        contract.submit_proof(
            "article_challenge", "bad", "https://example.com/x", "ipfs://mutable", "a" * 64, ""
        )
    with direct_vm.expect_revert("snapshot_sha256 must be 64 hex characters"):
        contract.submit_proof(
            "article_challenge", "bad2", "https://example.com/x", "https://example.com/snapshot", "bad", ""
        )


def test_duplicate_challenge_id_rejected(direct_vm, direct_deploy, direct_alice):
    contract = deploy_draft(direct_vm, direct_deploy, direct_alice)
    register_draft_mocks(direct_vm)
    with direct_vm.expect_revert("challenge id already exists"):
        contract.draft_challenge(
            "article_challenge", "Another title", "A sufficiently detailed and verifiable public rule for testing.", DEADLINE, "SPLIT", 70
        )
