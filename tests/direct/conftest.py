import json
import pytest


CONTRACT = "contracts/challenge_pool.py"
POOL = 10**18
DEADLINE = 1_767_229_200  # 2026-01-01T01:00:00Z


@pytest.fixture(autouse=True)
def _prompt_template_compat(direct_vm):
    """Bridge the v0.2.12 prompt-template GL call until gltest direct adds it."""
    def hook(vm, request):
        if "ExecPromptTemplate" not in request:
            return None
        payload = request["ExecPromptTemplate"]
        prompt = "\n".join(str(payload.get(key, "")) for key in ("input", "task", "criteria", "template"))
        response = vm._match_llm_mock(prompt)
        if response is None:
            raise AssertionError(f"No prompt-template mock matched {payload.get('template')}")
        return {"ok": response}

    direct_vm._gl_call_hook = hook
    yield
    direct_vm._gl_call_hook = None


def checklist_result(unverifiable=None):
    return json.dumps(
        {
            "checklist": [
                {
                    "id": "published",
                    "criterion": "The submitted snapshot contains a publicly readable article.",
                    "weight": 60,
                    "kind": "REQUIRED",
                },
                {
                    "id": "depth",
                    "criterion": "The article provides substantive technical analysis and examples.",
                    "weight": 40,
                    "kind": "QUALITY",
                },
            ],
            "unverifiable": unverifiable or [],
        },
        sort_keys=True,
    )


def assessment_result(score=60, published="MET", depth="NOT_MET", evidence="Article is visible."):
    return json.dumps(
        {
            "submissions": [
                {
                    "id": "proof_1",
                    "items": [
                        {"id": "published", "status": published, "evidence": evidence},
                        {"id": "depth", "status": depth, "evidence": "No technical examples found."},
                    ],
                    "score": score,
                    "summary": "The snapshot is public but lacks the requested depth.",
                },
                {
                    "id": "__anchor_empty__",
                    "items": [
                        {"id": "published", "status": "NOT_MET", "evidence": "Empty anchor."},
                        {"id": "depth", "status": "NOT_MET", "evidence": "Empty anchor."},
                    ],
                    "score": 0,
                    "summary": "The synthetic empty proof satisfies no criteria.",
                },
            ]
        },
        sort_keys=True,
    )


def register_draft_mocks(vm, response=None, comparison="ACCEPT"):
    vm.mock_llm(r"RUBRIC_GENERATION_TASK_V3", response or checklist_result())
    vm.mock_llm(r"RUBRIC_VALIDATION_CRITERIA_V3", "true" if comparison == "ACCEPT" else "false")


def register_judge_mocks(vm, response=None, comparison="ACCEPT"):
    vm.mock_web(r"raw\.githubusercontent\.com", {"status": 200, "body": "Published article with evidence."})
    vm.mock_llm(r"ASSESSMENT_GENERATION_TASK_V3", response or assessment_result())
    vm.mock_llm(r"ASSESSMENT_VALIDATION_CRITERIA_V3", "true" if comparison == "ACCEPT" else "false")


def deploy_draft(vm, direct_deploy, owner, mode="BEST_AT_DEADLINE", min_score=70, response=None):
    vm.warp("2026-01-01T00:00:00Z")
    contract = direct_deploy(CONTRACT, sdk_version="v0.2.12")
    vm.sender = owner
    register_draft_mocks(vm, response=response)
    contract.draft_challenge(
        "article_challenge",
        "Publish a technical GenLayer article",
        "Publish a public article of at least 500 words explaining GenLayer consensus with concrete examples.",
        DEADLINE,
        mode,
        min_score,
    )
    return contract


def confirm(vm, contract, owner, value=POOL):
    vm.sender = owner
    vm.value = value
    contract.confirm_challenge("article_challenge")
    vm.value = 0


def submit(vm, contract, submitter, submission_id="proof_1", suffix="abc123"):
    vm.sender = submitter
    contract.submit_proof(
        "article_challenge",
        submission_id,
        "https://example.com/original-article",
        "https://raw.githubusercontent.com/example/proofs/0123456789abcdef0123456789abcdef01234567/article.md",
        (suffix * 64)[:64],
        "Immutable snapshot captured at submission time.",
    )


def address_hex(value):
    if hasattr(value, "as_hex"):
        return value.as_hex
    if isinstance(value, bytes):
        return "0x" + value.hex()
    return str(value)
