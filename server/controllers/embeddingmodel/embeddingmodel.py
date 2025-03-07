from pymongo import MongoClient
from bson import ObjectId
import os
import datetime

from dotenv import load_dotenv
load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection_embedding_model = os.getenv("MONGO_COLLECTION_EMBEDDING_MODELS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection_embedding_model]

def serialize_model(model):
    model['_id'] = str(model['_id'])  
    return model

def add_embedding_model_data(data):
    try:
        model = {
            "embeddingModelName": data['embeddingModelName'],
            "embeddingModelParameters": data['embeddingModelParameters'],
            "embeddingModelchunkSize": data['embeddingModelchunkSize'],
            "embeddingModelchunkOverlap": data['embeddingModelchunkOverlap'],
            "created_at": datetime.datetime.now(),
        }

        collection.insert_one(model)
        return {"message": "Embedding Model added successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 500
    
def get_embedding_model_data():
    try:
        models = collection.find({})
        all_models = [serialize_model(model) for model in models]
        return {"models": all_models}, 200
    except Exception as e:
        print(e)
        return {"error": str(e)}, 500
    
def delete_embedding_model_data(model_id):
    try:
        result = collection.delete_one({"_id": ObjectId(model_id)})
        if result.deleted_count > 0:
            return {"message": "Model deleted successfully"}, 200
        else:
            return {"error": "Model not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500