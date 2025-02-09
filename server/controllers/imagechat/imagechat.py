import os,base64
import datetime 
from groq import Groq
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient
mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection_LLMCHATS = os.getenv("MONGO_COLLECTION_LLMCHATS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection_chatlogs = db[mongo_collection_LLMCHATS]


UPLOAD_IMAGE_FOLDER = 'uploadsImages'
if not os.path.exists(UPLOAD_IMAGE_FOLDER):
    os.makedirs(UPLOAD_IMAGE_FOLDER)

def encode_images(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def UploadImage(request):
    try:
        if 'image' not in request.files:
                return {"error": "No Image part in the request"}, 400
            
        file = request.files['image']
            

        if file.filename == '':
            return {"error": "No file selected"}, 400
            
        filename = "Image.png"
        file_path = os.path.join(UPLOAD_IMAGE_FOLDER, filename)

        file.save(file_path)

        public_url = f"{request.host_url}uploadsImages/{filename}"
        print(public_url)

        return {"message": f"File '{filename}' uploaded and saved to database successfully","public_url": public_url}, 200
    except Exception as e:
         return {"error": str(e)}, 500
    
  
def chatWithImage(uid,query,modelName):
    try:
        save_image_file_path = os.path.join(UPLOAD_IMAGE_FOLDER, "Image.png")

        client = Groq(api_key=os.getenv("GROQQ_API_KEY"))
        model = "llama-3.2-11b-vision-preview"
        base64_image = encode_images(save_image_file_path)
        start_time = datetime.datetime.now()
        chat_completiion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Analyze the provided image thoroughly, which is a page from a document containing text, 
                        tables, diagrams, and possibly other visual elements. Extract and interpret all relevant information, 
                        including text, data from tables, and details from diagrams or images. Answer the user’s query based 
                        on the information present in this image, ensuring that no important detail is overlooked. If no 
                        relevant content is found related to the query, respond by stating that no relevant content was 
                        found and provide a brief description of the content present in the image. \n\nUser query: {query}"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        model=model
    )
        end_time = datetime.datetime.now()
        generation_time = (end_time - start_time).total_seconds()

        data ={
            "uid":uid,
            "query":query,
            "llmGeneratedMessage":chat_completiion.choices[0].message.content,
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
                    "llm_response": chat_completiion.choices[0].message.content,
                    'generationTime': generation_time,
                    "chatId": str(result.inserted_id)
            }, 200
    
    except Exception as e:
        return {"error": str(e)}, 500