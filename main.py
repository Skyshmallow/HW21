from flask import Flask, render_template, request, jsonify, make_response, redirect
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, unset_jwt_cookies
from werkzeug.security import generate_password_hash, check_password_hash
import json
from datetime import timedelta, datetime
import uuid
from flask_session import Session
from flask_caching import Cache
from flask import session
from threading import Timer
from flask_cors import CORS
from datetime import datetime as dt
import pytz
import traceback
from flask_login import login_user, logout_user



app = Flask(__name__)
CORS(app)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'social_network_'


# Инициализация сессии
Session(app)

# Использование кэша
cache = Cache(app, config={'CACHE_TYPE': 'simple'})


# Загружаем пользователей из файла JSON
with open('static/users.json') as f:
    users = json.load(f)

# Настройка Flask JWT Extended
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Замена на свой секретный ключ
jwt = JWTManager(app)

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)

# Эндпоинт для главной страницы
@app.route('/')
def main():
    return render_template('main.html')


# Эндпоинт для подписки на канал
@app.route('/subscribe/<channel_id>', methods=['GET'])
@jwt_required()
def subscribe(channel_id):
    current_user = get_jwt_identity()

    # Получаем данные из кэша или другого источника данных
    user_channels = cache.get(current_user) or []

    # Подписываемся, если еще не подписаны
    if channel_id not in user_channels:
        user_channels.append(channel_id)

        # Сохраняем данные в кэше
        cache.set(current_user, user_channels)

        return jsonify({'message': f'You subscribed to channel {channel_id}'}), 200
    else:
        return jsonify({'message': f'You are already subscribed to channel {channel_id}'}), 200

@app.route('/unsubscribe/<channel_id>', methods=['GET'])
@jwt_required()
def unsubscribe(channel_id):
    current_user = get_jwt_identity()

    # Получаем данные из кэша или другого источника данных
    user_channels = cache.get(current_user) or []

    # Отписываемся, если подписаны
    if channel_id in user_channels:
        user_channels.remove(channel_id)

        # Сохраняем данные в кэше
        cache.set(current_user, user_channels)

        return jsonify({'message': f'You unsubscribed from channel {channel_id}'}), 200
    else:
        return jsonify({'message': f'You are not subscribed to channel {channel_id}'}), 200





@app.route('/set-theme/<theme>', methods=['GET'])
def set_theme(theme):
    session['theme'] = theme
    return jsonify({'message': f'Theme set to {theme}'}), 200




# Эндпоинт для регистрации
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('registration.html')
    elif request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # Проверяем уникальность email
        if any('email' in user and user['email'] == email for user in users):
            return jsonify({'message': 'Email is already registered'}), 400

        # Проверяем базовые требования к паролю
        if len(password) < 8:
            return jsonify({'message': 'Password must be at least 8 characters long'}), 400

        hashed_password = generate_password_hash(password)

        new_user = {
            'id': str(uuid.uuid4()),
            'email': email,
            'password': hashed_password,
            'role': 'user'
        }

        users.append(new_user)

        with open('static/users.json', 'w') as f:
            json.dump(users, f, indent=2)

        return jsonify({'message': 'Registration successful!'})


# Эндпоинт для аутентификации (логина)
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = next((user for user in users if user.get('email') == email), None)

    if user and check_password_hash(user.get('password'), password):
        # Создаем JWT токен
        access_token = create_access_token(identity=email)
        # Возвращаем токен и сообщение об успешной аутентификации
        return jsonify(access_token=access_token, message='Login successful!', redirect='/home')
    else:
        # Возвращаем сообщение об ошибке в случае неудачной аутентификации
        return jsonify({'message': 'Login failed. Check your email and password.'}), 401


# Эндпоинт для страницы home
@app.route('/home')
def home():
    return render_template('home.html')


# Пример защищенного эндпоинта
@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200


def get_user_role(email):
    # Здесь можно добавить логику для определения уровня доступа пользователя
    # Например, если есть поле 'role' в данных пользователя, можно использовать его.
    user = next((user for user in users if user.get('email') == email), None)
    return user.get('role') if user else None

# Эндпоинт для определения уровня доступа
@app.route('/user-role', methods=['GET'])
@jwt_required()
def get_user_role_endpoint():
    current_user = get_jwt_identity()
    role = get_user_role(current_user)
    return jsonify(user_role=role), 200


@app.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    current_user = get_jwt_identity()
    access_token = create_access_token(identity=current_user)
    return jsonify(access_token=access_token), 200

# Пример маршрута для получения постов из файла channels.json
@app.route('/get-posts-cached')
def get_posts_cached():
    try:
        with open('static/channels.json', 'r', encoding='utf-8') as file:
            channels_data = json.load(file)
        return jsonify(channels_data), 200
    except Exception as e:
        print(f'Error reading channels.json: {e}')
        return jsonify({'error': 'Internal Server Error'}), 500



# Эндпоинт для очистки кэша
@app.route('/clear-cache', methods=['GET'])
@jwt_required()
def clear_cache():
    current_user = get_jwt_identity()

    # Очищаем кэш
    cache.delete(f'posts:{current_user}')

    return jsonify({'message': 'Cache cleared'}), 200

# Эндпоинт для страницы пользователя
@app.route('/user')
def user():
    return render_template('user.html')

# Эндпоинт для страницы каналов
@app.route('/channels')
def channels():
    return render_template('channels.html')


def timer_function():
    with app.app_context():
        # Здесь можно добавить код, который будет выполняться по истечению таймера
        print('Я стану успешным!')

# Запуск таймера при старте приложения
timer = Timer(15.0, timer_function)
timer.start()



#---------------------------------------------

# Загружаем каналы из файла JSON
with open('static/channels.json') as f:
    channels = json.load(f)

# Новый эндпоинт для получения списка каналов
@app.route('/get-channels', methods=['GET'])
@jwt_required()
def get_channels():
    return jsonify(channels), 200





#---------------------------------------------




# Обновленный эндпоинт для получения постов
@app.route('/get-posts', methods=['GET'])
@jwt_required()
def get_posts():
    current_user = get_jwt_identity()

    # Получаем данные из кэша или другого источника данных
    user_channels = cache.get(current_user) or []

    # Получаем параметр channelId из запроса
    channel_id = request.args.get('channelId')

    # Если есть channelId, получаем посты только для этого канала
    if channel_id:
        posts = channels.get(channel_id, {}).get('posts', [])
    else:
        # Иначе получаем посты из подписанных каналов
        posts = []
        for channel_id in user_channels:
            channel_posts = channels.get(channel_id, {}).get('posts', [])
            posts.extend(channel_posts)

    try:
        # Преобразуем строки времени в объекты datetime (если необходимо)
        for post in posts:
            if isinstance(post['timestamp'], str):
                post['timestamp'] = datetime.strptime(post['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')
                post['timestamp'] = post['timestamp'].replace(tzinfo=pytz.UTC)
    except ValueError as e:
        print(f"Error converting timestamp: {e}")
        return jsonify({"error": "Error converting timestamp"}), 500

    # Сортируем по времени
    posts.sort(key=lambda x: x['timestamp'], reverse=True)

    return jsonify(posts), 200






#---------------------------------------------


# Эндпоинт для загрузки подписок пользователя и их постов
@app.route('/user-subscriptions', methods=['GET'])
@jwt_required()
def user_subscriptions():
    current_user = get_jwt_identity()

    # Получаем данные из кэша или другого источника данных
    user_channels = cache.get(current_user) or []

    # Получаем информацию о каналах и их постах
    subscriptions_with_posts = []
    for channel_id in user_channels:
        channel_info = channels.get(channel_id)
        if channel_info:
            subscriptions_with_posts.append(channel_info)

    return jsonify(subscriptions_with_posts), 200


#---------------------------------------------



@app.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        # Отзыв токенов доступа и обновления
        response = make_response(jsonify(message="Logged out successfully"), 200)
        unset_jwt_cookies(response)
        return response
    except Exception as e:
        return jsonify(message=str(e)), 500


#---------------------------------------------

if __name__ == '__main__':
    app.run(debug=True)
# host='0.0.0.0', port=5000, 