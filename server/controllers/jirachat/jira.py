import os,requests,json,datetime
from groq import Groq
from dotenv import load_dotenv
load_dotenv()
LLM_API_URL = os.getenv("LLM_API_URL")
from pymongo import MongoClient
mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection_LLMCHATS = os.getenv("MONGO_COLLECTION_LLMCHATS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection_chatlogs = db[mongo_collection_LLMCHATS]

JIRA_UPLOAD_FOLDER = 'jirauploads'
if not os.path.exists(JIRA_UPLOAD_FOLDER):
    os.makedirs(JIRA_UPLOAD_FOLDER)

def chatWithJira(uid,query,modelName):
    try:
        save_file_path = os.path.join(JIRA_UPLOAD_FOLDER, "JIRATEXTFINAL.txt")
        context = ""
        with open(save_file_path, 'r', encoding='utf-8') as file:
            context = file.read()

        client = Groq(api_key=os.getenv("GROQQ_API_KEY"))
        model_name = "llama-3.1-8b-instant"
        temperature=0.1
        max_tokens=2048
        start_time = datetime.datetime.now()
        user_message = {
        "role": "user",
        "content": f"Here is the content of a Jira document:\n\n{context}\n\nUsing the context provided answer the query: {query}"
        }

        system_message = {
        "role": "system",
        "content": """You are a helpful assistant with expertise in reading Jira documents and 
        extracting detailed information from text files. Your role is then to answer the user queries
        only if it relevant to the Jira content provided, if the answer to the user query is not 
        found in the jira content then mention it is not available in the jira file provided, and do
        not generate answers on your own."""
        }
    


        # Step 3: Initialize the Groq client and send the query
        chat_completion = client.chat.completions.create(
            messages=[
                system_message,
                user_message
            ],
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=1,
            stop=None,
            stream=False
        )

        # Step 4: Return the response from the LLM
        resultdata = chat_completion.choices[0].message.content

        end_time = datetime.datetime.now()
        generation_time = (end_time - start_time).total_seconds()

        data ={
            "uid":uid,
            "query":query,
            "llmGeneratedMessage":resultdata,
            "modelName":modelName,
            "created_at": datetime.datetime.now(),
            "startTime":start_time,
            "endTime":end_time,
            "comments":None,
            "userInput":None,
            "source":'imagechat',
        }
        
        result = collection_chatlogs.insert_one(data)

        return {
                    "llm_response": resultdata,
                    'generationTime': generation_time,
                    "chatId": str(result.inserted_id)
            }, 200
    
    except Exception as e:
        return {"error": str(e)}, 500

