import ollama


def analyze_logs_with_ai(logs):

    prompt = f"""
    You are an expert Kubernetes DevOps and Site Reliability Engineer.

    Analyze the following Kubernetes pod logs.

    Return:
    1. Root Cause
    2. Severity
    3. Explanation
    4. Remediation Steps

    Logs:
    {logs}
    """

    try:

        print("Sending request to Ollama...")

        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        print("Received response from Ollama")

        return response.message.content

    except Exception as e:

        print("OLLAMA ERROR:", str(e))

        return f"AI Analysis Failed: {str(e)}"