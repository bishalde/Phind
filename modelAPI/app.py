from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
import ollama # type: ignore
from groq import Groq
import datetime,json


from controllers.chatlogs.chatlogs import saveLlmChatLogs,setChatcomments,downloadChatlogs,getChatHistory,getKeywordChatHistoryWithMoreLikes

app = Flask(__name__)
CORS(app)


def getKeywordTokens(query):
    system_message = """
You are an AI designed to extract important keywords from a user query. 
Your task is to identify the key concepts or terms that represent the main ideas in the query. 
Follow these rules:
- Focus on nouns, noun phrases, or specific terms that capture the core topics.
- Ignore common words like 'write', 'tell', 'me', 'about', 'the', 'for', unless they are part of a specific concept.
- Preserve multi-word phrases (e.g., "binary search") as single keywords when they represent a unified concept.
- Return the keywords as a valid Python list in string format, e.g., ["keyword1"] and return only main one element and it should also in lowercase.
- Do not include explanations, code, or any text outside the list.
- Ensure the output is a properly formatted JSON-like string that can be parsed as a Python list.

Examples:
1. Query: "write the code for perceptron"
   Output: ["perceptron"]
2. Query: "tell me about binary search and write the code"
   Output: ["binary search"]
3. Query: "explain the theory of relativity to me"
   Output: ["theory of relativity"]
4. Query: "code for armstrong number"
   Output: ["armstrong number"]
5. Query: "what is fibonacci series and write the code"
   Output: ["fibonacci series"]
6. Query: "write the code for a simple calculator"
   Output: ["simple calculator"]
7. Query: "explain how neural networks work and provide an example code"
   Output: ["neural networks"]
8. Query: "write the code to check if a number is prime"
   Output: ["prime number check"]
"""
    
    # Initialize the Groq client (replace 'your-api-key' with your actual Groq API key)
    client = Groq(api_key="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")
    
    messages = [
        {
            'role': 'system',
            'content': system_message
        },
        {
            'role': 'user',
            'content': query
        }
    ]
    
    # Call the Groq API
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",  # Example Groq model; adjust based on available models
        messages=messages,
        max_tokens=100,  # Limit the response length
        temperature=0.5  # Adjust for determinism; lower values make it more precise
    )
    
    # Extract the content from the response
    content = response.choices[0].message.content
    
    # Convert the LLM output to a Python list
    try:
        keyword_list = json.loads(content)  # Parse the string into a Python list
    except json.JSONDecodeError:
        # Fallback in case the LLM doesn't return a valid list format
        keyword_list = [kw.strip('[]"\n ') for kw in content.split(',')]
    
    return keyword_list


    
@app.route('/',methods=['GET'])
def home():
    return "<H1>Model API - Homepage</H1>"

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        uid = data.get('uid')
        modelName = data.get('modelName')
        query = data.get('query', '').strip()     
        source = data.get('source', '').strip() 

    
        keywordsToken = getKeywordTokens(query)
        keywordChatList = getKeywordChatHistoryWithMoreLikes(keywordsToken[0])
        if keywordChatList != None:
            print("Got keyword chat history")
            keywordChatList = keywordChatList[0]
            context = f"""
                *Another User* asked an query earlier : {keywordChatList['query']} 
                The *LLM* answered the *Another User* with :
                ```
                {
                    keywordChatList['llmGeneratedMessage']
                }
                ```
                *Another User* gave an feedback to the answer generated as : {keywordChatList['userInput']}
                now a *User* is asking with the new query : {query}
                on the basis of the feedback of the *Another User* , not try to answer the new query again.
                
                
                i want you to answer the new query based on the feedback provied by the *Another User*
            """
            
            messages = [
            {
                'role': 'user',
                'content': context
            }
            ]
            
            
            response = ollama.chat(model='llama3.2:1b', messages=messages)
            suggestedAnswer = response['message']['content']
        else:
            suggestedAnswer = None
        # Constructing the message list with strict guidelines
        messages = [
            # {
            #     'role': 'system',
            #     'content': system_message
            # },
            {
                'role': 'user',
                'content': query
            }
        ]
        
        start_time = datetime.datetime.now()

        # Call the LLM model with context and query
        if modelName == 'llama3.2:1b':
            response = ollama.chat(model='llama3.2:1b', messages=messages)
        elif modelName == 'llama3.2:3b':
            response = ollama.chat(model='llama3.2:3b', messages=messages)
        elif modelName == 'llama3.1:8b':
            response = ollama.chat(model='llama3.1:8b', messages=messages)
        elif modelName == 'deepseek-r1:1.5b':
            response = ollama.chat(model='deepseek-r1:1.5b', messages=messages)
        elif modelName == 'qwen2.5:1.5b':
            response = ollama.chat(model='qwen2.5:1.5b', messages=messages)
        elif modelName == 'qwen2.5:latest':
            response = ollama.chat(model='qwen2.5:latest', messages=messages)
        else :
            return jsonify({'error': f'Unsupported model: {modelName}'}), 400
        
        

        end_time = datetime.datetime.now()
        generation_time = (end_time - start_time).total_seconds()


        # Prepare chat log data
        chatLogData = {
            'uid': uid,
            'query': query,
            'generatedMessage': response['message']['content'],
            'modelName':modelName,
            'startTime': start_time,
            'endTime': end_time ,
            'source' : source,
            "keywordsToken":keywordsToken[0]
        }

        # Save the chat log
        savedChatData = saveLlmChatLogs(chatLogData)[0]

        res = {'response': response['message']['content'], "chatId": savedChatData['chatId'],'generationTime': generation_time,'suggestedAnswer':suggestedAnswer or None}
  
        return jsonify(res)

    except Exception as e:
        print(e)
        print(f"Error during LLM chat: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/chatcomments', methods=['GET'])
def ChatComments():
    try:
        chatId = request.args.get('chatId')
        comment = request.args.get("comment")
        userInput = request.args.get("userInput",None)
        if userInput:
            chatLogData = setChatcomments(chatId,comment,userInput)
        else:
            chatLogData = setChatcomments(chatId,comment)
        return jsonify(chatLogData)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/downloadlogs',methods=['POST'])
def download_logs():
    try:
        # Get the start and end date from the request body
        data = request.json
        start_date_str = data.get('startDate')
        end_date_str = data.get('endDate')

        # Call the helper function to generate the Excel file
        return downloadChatlogs(start_date_str, end_date_str)

    except Exception as e:
        print(f"Error At APP: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/chathistory', methods=['GET'])
def chatHistory():
    try:
        uid = request.args.get('uid')
        chatLogData = getChatHistory(uid)[0]
        return chatLogData

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,port=5001,host='0.0.0.0')
