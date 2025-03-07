import os,requests,json

from dotenv import load_dotenv
load_dotenv()



LLM_API_URL = os.getenv("LLM_API_URL")



def chatWithLLM(uid,query_text,modelName):
    try:

        # Send the accumulated context and query to the LLM API
        api_url = f"{LLM_API_URL}/chat"
        api_payload = {
            "uid": uid,
            "query": query_text,
            "modelName":modelName,
            "source":"llmchat"
        }
        headers = {'Content-Type': 'application/json'}
           
        response = requests.post(api_url, data=json.dumps(api_payload), headers=headers)
        
        if response.status_code == 200:
            llm_response = response.json().get('response', 'No response from LLM')
            generationTime = response.json().get('generationTime', '-- ms')
            chatId = response.json().get('chatId', None)
            suggestedAnswer = response.json().get('suggestedAnswer', None)
            
            # Return the LLM's response and the accumulated context
            return {
                "llm_response": llm_response,
                "chatId": chatId,
                "suggestedAnswer":suggestedAnswer,
                "generationTime":str(generationTime)[:5]
            }, 200
        else:
            return {"error": "Failed to get response from LLM API"}, response.status_code

    except Exception as e:
        return {'error': str(e)}, 500