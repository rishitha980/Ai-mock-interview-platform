"""
Code Runner Sandbox — Module 12
Executes user-submitted Python code in an isolated subprocess with strict timeout enforcement.
Captures stdout, stderr, and execution metadata.
"""

import subprocess
import tempfile
import os
import time
import sys
import logging

logger = logging.getLogger("code_runner")

TIMEOUT_SECONDS = 5.0  # Maximum execution time per run
MAX_OUTPUT_LENGTH = 10000  # Truncate output beyond this length


def run_python_code(user_code: str, test_input: str = "") -> dict:
    """
    Runs Python code in a subprocess with the given test_input fed via stdin.
    Returns a dict with stdout, stderr, exit_code, timed_out, and execution_time.
    """
    result = {
        "stdout": "",
        "stderr": "",
        "exit_code": -1,
        "timed_out": False,
        "execution_time_ms": 0,
        "success": False,
    }

    # Write user code to a temporary file
    tmp_file = None
    try:
        tmp_file = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            delete=False,
            dir=tempfile.gettempdir(),
        )
        tmp_file.write(user_code)
        tmp_file.flush()
        tmp_file.close()

        start_time = time.perf_counter()

        proc = subprocess.run(
            [sys.executable, tmp_file.name],
            input=test_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=tempfile.gettempdir(),
        )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        result["stdout"] = proc.stdout[:MAX_OUTPUT_LENGTH] if proc.stdout else ""
        result["stderr"] = proc.stderr[:MAX_OUTPUT_LENGTH] if proc.stderr else ""
        result["exit_code"] = proc.returncode
        result["execution_time_ms"] = elapsed_ms
        result["success"] = proc.returncode == 0

    except subprocess.TimeoutExpired:
        result["timed_out"] = True
        result["stderr"] = f"Execution timed out after {TIMEOUT_SECONDS} seconds."
        result["execution_time_ms"] = TIMEOUT_SECONDS * 1000

    except Exception as e:
        result["stderr"] = f"Execution error: {str(e)}"
        logger.error(f"Code runner error: {e}")

    finally:
        # Clean up temporary file
        if tmp_file and os.path.exists(tmp_file.name):
            try:
                os.unlink(tmp_file.name)
            except OSError:
                pass

    return result


def run_code_against_tests(user_code: str, test_cases: list, language: str = "python") -> list:
    """
    Runs user code against a list of test cases.
    Each test case has 'input' and 'expected' keys.
    Returns a list of results with pass/fail status.
    """
    results = []

    for i, test_case in enumerate(test_cases):
        test_input = test_case.get("input", "")
        expected_output = test_case.get("expected", "").strip()

        run_result = run_python_code(user_code, test_input)

        actual_output = run_result["stdout"].strip()
        passed = actual_output == expected_output and run_result["success"]

        results.append({
            "test_index": i + 1,
            "input": test_input,
            "expected": expected_output,
            "actual": actual_output,
            "passed": passed,
            "timed_out": run_result["timed_out"],
            "stderr": run_result["stderr"],
            "execution_time_ms": run_result["execution_time_ms"],
        })

    return results
