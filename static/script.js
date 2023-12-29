
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            // Вход успешен, сохраняем токен в localStorage
            localStorage.setItem('access_token', data.access_token);
            console.log(data.access_token);  
            // Переход на домашнюю страницу
            window.location.href = data.redirect;
        } else {
            // Ошибка входа, выводим сообщение
            alert('Login failed. Check your email and password.');
        }
    })

    .catch(error => console.error('Error:', error));
}



function register() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Registration successful!') {
            alert('Registration successful!');
            $('#registrationModal').modal('hide');
        } else {
            alert('Registration failed. Check your email and password.');
        }
    })
    .catch(error => console.error('Error:', error));
}

function refreshToken() {
    const access_token = localStorage.getItem('access_token');

    fetch('/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            // Обновление токена успешно, сохраняем новый токен
            localStorage.setItem('access_token', data.access_token);
        }
    })
    .catch(error => console.error('Error refreshing token:', error));
}


// Функция для загрузки информации о пользователе
function loadUserInfo() {
    fetch('/user-info', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        }
    })
    .then(response => response.json())
    .then(userInfo => {
        // Заполняем элемент с именем пользователя
        document.getElementById('username').textContent = userInfo.username;
    })
    .catch(error => console.error('Error loading user info:', error));
}

function redirectToUserPage() {
    window.location.href = '/user';
}

// Функция для перехода на страницу каналов
function redirectToChannelsPage() {
    window.location.href = '/channels';
}

function loadPosts(url) {
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        }
    })
    .then(response => response.json())
    .then(posts => {
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';  // Очищаем контейнер перед добавлением новых постов

        posts.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    })
    .catch(error => console.error('Error loading posts:', error));
}


// Функция для создания элемента поста
function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post';  // Добавляем класс 'post' для стилизации
    postElement.classList.add('bg-dark', 'rounded-5');
    postElement.innerHTML = `
        <h3 class="text-white fw-bold">${post.title}</h3>

        <p>${post.content}</p>
        <small>${new Date(post.timestamp).toLocaleString()}</small>
    `;
    return postElement;
}


// Функция для подписки/отписки от канала
function toggleSubscription(channelId, subscribe) {
    const action = subscribe ? 'subscribe' : 'unsubscribe';
    fetch(`/${action}/${channelId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        }
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (subscribe) {
            // Если подписка успешна, перезагрузите страницу
            location.reload();
        } else {
            // Если отписка успешна, обновите список каналов
            loadChannelsWithSubscription();
        }
    })
    .catch(error => {
        console.error(`Error ${action}ing:`, error);
        if (!subscribe) {
            // Если отписка не удалась, все равно обновите список каналов
            loadChannels();
        }
    });
}


// Функция для загрузки каналов
function loadChannels() {
    fetch('/get-channels', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        }
    })
    .then(response => response.json())
    .then(channels => {
        const channelsList = document.getElementById('channels-list');
        channelsList.innerHTML = '';  // Очищаем список перед добавлением новых каналов

        channels.forEach(channel => {
            const channelItem = createChannelItem(channel.id, channel.name);
            channelsList.appendChild(channelItem);
        });
    })
    .catch(error => console.error('Error loading channels:', error));
}



//----------------------------------


// Функция для создания элемента канала
function createChannelItem(channelId, channelName) {
    const channelItem = document.createElement('li');
    channelItem.className = 'channel-item';  // Добавляем класс 'channel-item' для стилизации
    channelItem.id = `channel-${channelId}`;

    channelItem.innerHTML = `
        <div class="channel-info">
            <div class="channel-name">${channelName}</div>
            <div class="subscription-buttons">
                <button class="subscription-button" onclick="toggleSubscription('${channelId}', true)">Subscribe</button>
                <button class="subscription-button" onclick="toggleSubscription('${channelId}', false)">Unsubscribe</button>
            </div>
        </div>
        <div id="posts-${channelId}"></div> <!-- Добавим div для отображения постов -->
        <hr>
    `;

    loadPostsForChannel(channelId);

    return channelItem;
}





function loadPostsForChannel(channelId) {
    if (channelId) {
        const url = `/get-posts?channelId=${channelId}`;

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            }
        })
        .then(response => response.json())
        .then(posts => {
            const postsContainer = document.getElementById(`posts-${channelId}`);
            // postsContainer.classList.add('mt-1', 'text-secondary');
            postsContainer.classList.add('mt-1', 'bg-secondary');

            // postsContainer.classList.add('mt-1', 'change color here by bootstrap');
            if (postsContainer) {
                postsContainer.innerHTML = '';  // Очищаем контейнер перед добавлением новых постов

                posts.forEach(post => {
                    const postElement = createPostElement(post);
                    postsContainer.appendChild(postElement);
                });
            } else {
                console.error(`Posts container with id "posts-${channelId}" not found`);
            }
        })
        .catch(error => console.error('Error loading posts:', error));
    } else {
        console.error('Channel ID is undefined');
    }
}




//----------------------------------

document.addEventListener("DOMContentLoaded", function () {
    console.log('Loading channels with subscription');
    if (window.location.pathname === '/home') {
        loadChannelsWithSubscription();
    }
});


//----------------------------------






//----------------------------------


// Обновленная функция загрузки каналов

function loadChannelsWithSubscription() {
    fetch('/get-channels', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        }
    })
    .then(response => response.json())
    .then(channels => {
        console.log('Channels received:', channels);

        const channelsList = document.getElementById('channels-list');
        if (!channelsList) {
            console.error('Error: Element with id "channels-list" not found.');
            return;
        }

        channelsList.innerHTML = '';

        if (typeof channels === 'object' && channels !== null) {
            const channelsArray = Object.values(channels);

            channelsArray.forEach(channel => {
                const channelItem = createChannelItemWithSubscription(channel);
                channelsList.appendChild(channelItem);

                // Загрузка постов для каждого канала
                loadPostsForChannel(channel.id);
            });
        } else {
            console.error('Channels data is not an object or is null:', channels);
        }
    })
    .catch(error => console.error('Error loading channels:', error));
}







// функция для создания элемента канала с кнопками подписки/отписки
function createChannelItemWithSubscription(channel) {
    const channelItem = document.createElement('li');
    // channelItem.style.marginTop = "20px";
    channelItem.classList.add('mt-5');
    channelItem.classList.add('mb-3');
    channelItem.innerHTML = `
        ${channel.name} 
        <button class="btn btn-primary" onclick="toggleSubscription('${channel.id}', true)">Subscribe</button>
        <button class="btn btn-danger" onclick="toggleSubscription('${channel.id}', false)">UnSubscribe</button>
        
        <div id="posts-${channel.id}"></div>
    `;
    return channelItem;
}


// Вызываем функцию загрузки каналов при загрузке страницы каналов
document.addEventListener("DOMContentLoaded", function () {
    console.log('Loading channels with subscription');
    if (window.location.pathname === '/channels') {
        loadChannelsWithSubscription();
    }
});

//----------------------------------



// Функция для загрузки подписок пользователя и их постов
function loadUserSubscriptions() {
    fetch('/user-subscriptions', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        }
    })
    .then(response => response.json())
    .then(subscriptions => {
        // Проверяем, что элемент существует перед его использованием
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) {
            console.error('Error: Element with id "posts-container" not found.');
            return;
        }

        // Очищаем контейнер перед добавлением новых постов
        postsContainer.innerHTML = '';

        subscriptions.forEach(channel => {
            const channelItem = createChannelItemWithSubscription(channel);
            postsContainer.appendChild(channelItem);

            // Загружаем посты для каждого канала
            loadPostsForChannel(channel.id);
        });
    })
    .catch(error => console.error('Error loading user subscriptions:', error));
}




// Отображение постов на странице
function displayPosts(channelId, posts) {
    // Найдите контейнер для постов
    const postsContainer = document.getElementById(`posts-${channelId}`);

    // Очистите контейнер перед добавлением новых постов
    postsContainer.innerHTML = '';

    // Добавьте посты в контейнер
    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
}

// Вызываем функцию загрузки подписок при загрузке страницы home
document.addEventListener("DOMContentLoaded", function () {
    console.log('Loading user subscriptions');
    if (window.location.pathname === '/home') {
        loadUserSubscriptions();
    }
});



//----------------------------------



function logout() {
    const access_token = localStorage.getItem('access_token');

    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`,
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        alert(data.message);
        // Очистите локальное хранилище и перенаправьте пользователя на страницу входа
        localStorage.removeItem('access_token');
        window.location.href = '/';
    })
    .catch(error => console.error('Error during logout:', error.message));
}



// Ваш код для определения события нажатия кнопки выхода
const logoutButton = document.getElementById('logoutButton'); // Замените 'logoutButton' на реальный ID кнопки
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}


//----------------------------------