import os

from dotenv import load_dotenv

from openai import OpenAI


# Load environment variables from .env
load_dotenv()


# Read API key
api_key = os.getenv("OPENAI_API_KEY")


# Debug check
print("OPENAI_API_KEY =", api_key)


# Create OpenAI client
client = OpenAI(
    api_key=api_key
)


def analyze_logs_with_ai(logs):

    prompt = f"""
    You are an expert DevOps SRE engineer.

    Analyze the following Kubernetes crash logs.

    Logs:
    {logs}

    Return:
    1. Root cause
    2. Severity
    3. Recommended fix
    """

    try:

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a Kubernetes and DevOps expert."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )

        return response.choices[0].message.content

    except Exception as e:

        return str(e)