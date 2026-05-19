import time


def process_incident(data):

    print("Processing incident...")

    time.sleep(5)

    result = {
        "incident": data,
        "status": "processed",
        "message": "Incident analyzed successfully"
    }

    print(result)

    return result