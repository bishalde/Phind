from flask import Flask, request, jsonify,send_from_directory, Response, stream_with_context # type: ignore
from flask_cors import cross_origin,CORS # type: ignore
import os
import requests

from controllers.auth.Users import add_user,get_user,verify_user
from controllers.uploader.fileload import upload_file,get_files,delete_file,upload_jira_file
from controllers.models.models import add_model,get_models,delete_model
# from controllers.createEmbeddings.embeddings import createEmbedding,getEmbeddings,searchQuery
from controllers.embeddingmodel.embeddingmodel import add_embedding_model_data,get_embedding_model_data,delete_embedding_model_data
from controllers.llmchat.llm import chatWithLLM
from controllers.imagechat.imagechat import UploadImage,chatWithImage
from controllers.urlchat.urlchat import UploadURL,chatWithURL

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route('/',methods=['GET'])
def home():
    return "<H1>3GPP Server API - Homepage</H1>"

'''
    USER AUTHENTICATION & VERIFICATION
'''
@app.route('/register', methods=['POST'])
def add_user_route():
    user_data = request.json
    try:
        response, status_code = add_user(user_data)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

@app.route('/login', methods=['POST'])
def login_route():
    user_data = request.json
    try:
        response, status_code = get_user(user_data['email'], user_data['password'])
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

@app.route('/verify', methods=['GET'])
def verify_route():
    id = request.args.get('id')
    try:
        response, status_code = verify_user(id)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code


'''
    FILE UPLOADS
'''
@app.route('/uploadfile', methods=['POST'])
def upload_file_route():
    try:
        response, status_code = upload_file(request)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

@app.route('/uploadjirafile', methods=['POST'])
def upload_jira_file_route():
    try:
        response, status_code = upload_jira_file(request)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

@app.route('/uploadfile', methods=['GET'])
def download_file_route():
    embeddingsChoice = request.args.get('embeddingsChoice')
    try:
        response, status_code = get_files(embeddingsChoice)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code


@app.route('/deletefile/<file_id>', methods=['DELETE'])
def delete_file_route(file_id):
    try:
        response, status_code = delete_file(file_id)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

'''
    MODELS
'''
@app.route('/model', methods=['POST'])
def add_model_route():
    model_data = request.json
    try:
        response, status_code = add_model(model_data)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

@app.route('/model', methods=['GET'])
def get_model():
    try:
        response, status_code = get_models()
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code
def delete_model_path(model_id):
    try:
        response, status_code = delete_model(model_id)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code

@app.route('/model/<model_id>', methods=['DELETE'])
def delete_model_route(model_id):
    try:
        response, status_code = delete_model(model_id)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code




@app.route('/embeddingmodel', methods=['POST'])
def create_embeddings():
    embeddingData=request.json
    try:
        response, status_code = add_embedding_model_data(embeddingData)
        return jsonify(response), status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/embeddingmodel', methods=['GET'])
def get_embedding_model_route():
    try:
        response, status_code = get_embedding_model_data()
        return jsonify(response), status_code
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route('/embeddingmodel/<model_id>', methods=['DELETE'])
def delete_embedding_model_route(model_id):
    try:
        response, status_code = delete_embedding_model_data(model_id)
    except Exception as e:
        response = {"error": str(e)}
        status_code = 500
    return jsonify(response), status_code
    
@app.route('/chatWithLLM', methods=['POST'])
def chat_with_LLM():
    queryData=request.json
    try:
        response, status_code = chatWithLLM(queryData["uid"],queryData["query"],queryData["modelName"])
        return jsonify(response), status_code
    except Exception as e:
        print("Error in chat with LLM query",e)
        return jsonify({"error": str(e)}), 500
    
    
    
@app.route('/chatWithurl', methods=['POST'])
def chat_with_url():
    queryData=request.json
    try:
        response, status_code = chatWithURL(queryData["uid"],queryData["sourceUrl"],queryData["query"],queryData["modelName"])
        return jsonify(response), status_code
    except Exception as e:
        print("Error in Jira query : ",e)
        return jsonify({"error": str(e)}), 500
    
    
@app.route('/chatwithimage', methods=['POST'])
def chat_with_image():
    queryData=request.json
    try:
        response, status_code = chatWithImage(queryData["uid"],queryData["query"],queryData["modelName"])
        return jsonify(response), status_code
    except Exception as e:
        print("Error in Jira query : ",e)
        return jsonify({"error": str(e)}), 500
    
@app.route('/uploadimage', methods=['POST'])
def upload_image():
    try:
        response, status_code = UploadImage(request)
        return jsonify(response), status_code
    except Exception as e:
        print("Error in Image query : ",e)
        return jsonify({"error": str(e)}), 500
    
@app.route('/uploadURL', methods=['POST'])
def upload_URL():
    try:
        response, status_code = UploadURL(request)
        return jsonify(response), status_code
    except Exception as e:
        print("Error in URL Fetching : ",e)
        return jsonify({"error": str(e)}), 500



@app.route('/files/<filename>')
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/uploadsImages/<filename>')
def serve_image_file(filename):
    return send_from_directory("uploadsImages", filename)


"""
    STREAMLIT APPS
"""
# Proxy to the Streamlit app running on port 8501
STREAMLIT_URL = "http://localhost:8501"

@app.route('/streamlit/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_streamlit(path):
    """
    Proxy requests from /streamlit to the Streamlit app.
    """
    streamlit_url = f"{STREAMLIT_URL}/{path}"
    req_headers = {key: value for key, value in request.headers if key != 'Host'}
    
    try:
        # Forward the request to Streamlit
        if request.method == 'GET':
            resp = requests.get(streamlit_url, headers=req_headers, stream=True)
        elif request.method == 'POST':
            resp = requests.post(streamlit_url, headers=req_headers, data=request.get_data(), stream=True)
        elif request.method == 'PUT':
            resp = requests.put(streamlit_url, headers=req_headers, data=request.get_data(), stream=True)
        elif request.method == 'DELETE':
            resp = requests.delete(streamlit_url, headers=req_headers, stream=True)
        else:
            return "Method not supported", 405
        
        # Stream the response back to the client
        return Response(stream_with_context(resp.iter_content(chunk_size=1024)), 
                        status=resp.status_code,
                        headers=dict(resp.headers))
    
    except requests.exceptions.RequestException as e:
        return f"Error: Unable to proxy to Streamlit app. {str(e)}", 500

# Run Flask app
if __name__ == "__main__": 
    app.run(debug=True, host='0.0.0.0',use_reloader=False)
