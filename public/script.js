var username, storedUsername, AIChatUsername, storedAIChatUsername, isAutoResponse

async function startupUsernames() {
    storedUsername = localStorage.getItem('username');
    storedAIChatUsername = localStorage.getItem('AIChatUsername');

    username = storedUsername !== null && storedUsername !== '' ? storedUsername : await initializeUsername();
    AIChatUsername = storedAIChatUsername !== null && storedAIChatUsername !== '' ? storedAIChatUsername : username;
    console.log(`[localStorage] username:${username}, AIChatUsername:${AIChatUsername}`)
}

async function initializeUsername() {
    var userInput = prompt("Enter your username:");
    if (userInput !== null && userInput !== "") {
        localStorage.setItem('username', userInput);
        console.log(`set localStorage 'username' to ${userInput}`)
        return String(userInput)
    } else {
        initializeUsername()
    }
}

var sanitizeExtension = {
    type: 'output',
    filter: function (text) {
        var sanitizedHTML = DOMPurify.sanitize(text, {
            FORBID_TAGS: ['style', 'audio', 'script', 'iframe', 'object', 'embed', 'form'], // Exclude the specified tags
            FORBID_ATTR: ['onload', 'onclick', 'onmouseover', 'srcdoc', 'data-*', 'style'] // Exclude the specified attributes
        });
        return sanitizedHTML;
    }
};

var converter = new showdown.Converter({
    simpleLineBreaks: true,
    openLinksInNewWindow: true,
    parseImgDimensions: false,
    emoji: true,
    backslashEscapesHTMLTags: true,
    literalMidWordUnderscores: true,
    strikethrough: true,
    extensions: [sanitizeExtension]
});

//routine to check if we are on an iOS device or not
var dummyElement = $('<div>').css('-webkit-touch-callout', 'none');
var isIOS = dummyElement.css('-webkit-touch-callout') === 'none';
dummyElement.remove();

var hostname = window.location.hostname;
var port = window.location?.port;
var wsType = window.location.hostname === (`localhost` || `127.0.0.1`) ? 'ws' : 'wss'
var serverUrl = `${wsType}://${hostname}:${port}`

var socket = null
var userRole = (hostname === 'localhost' || hostname === '127.0.0.1') ? 'Host' : 'Guest';
var isHost = (userRole === 'Host') ? true : false;

//API_PARAMS_FOR_TABBY
var TabbyAPICallParams = {
    "prompt": "",
    "stream": false,
    "truncation_length": 4096,
    "max_tokens": 200,
    "temperature": 2,
    "top_k": 0,
    "top_p": 1,
    "min_p": 0.2,
    "typical_p": 1,
    "tfs": 1,
    "repetition_penalty": 1.1,
    "repetition_penalty_range": 400,
    "seed": -1,
    "skip_special_tokens": true,
    "mirostat_mode": 0,
    "mirostat_tau": 5,
    "mirostat_eta": 0.1,
    "grammar_string": "",
    "custom_token_bans": "",
    "stop": []
}
//END_OF_TABBY_PARAMETERS

//API_PARAMS_FOR_HORDE
var HordeAPICallParams = {
    "prompt": "",
    "params": {
        "gui_settings": false,
        "sampler_order": [
            6,
            0,
            1,
            2,
            3,
            4,
            5
        ],
        "max_context_length": 2048,
        "max_length": 400,
        "rep_pen_slope": 1,
        "temperature": 1,
        "tfs": 0.95,
        "top_a": 0,
        "top_k": 100,
        "top_p": 0.9,
        "typical": 1,
        "s1": 6,
        "s2": 0,
        "s3": 1,
        "s4": 2,
        "s5": 3,
        "s6": 4,
        "s7": 5,
        "use_world_info": false,
        "singleline": false,
        "streaming": false,
        "can_abort": false,
        "n": 1,
        "frmtadsnsp": false,
        "frmtrmblln": false,
        "frmtrmspch": false,
        "frmttriminc": false,
        "stop_sequence": [`${username}:`]
    },
    "trusted_workers": true,
    "models": [
        "koboldcpp/mistral-pygmalion-7b.Q5_K_M",
        "koboldcpp/Toppy-M-7B",
        "koboldcpp/LLaMA2-13B-Tiefighter",
        "aphrodite/jebcarter/psyonic-cetacean-20B",
        "aphrodite/DiscoResearch/DiscoLM-120b",
        "aphrodite/KoboldAI/LLaMA2-13B-Psyfighter2",
        "aphrodite/Undi95/Toppy-M-7B",
        "koboldcpp/Noromaid-7b-v0.1.1",
        "koboldcpp/Mistral-7B-claude-chat",
        "aphrodite/alpindale/goliath-120b",
        "koboldcpp/Mistral-7B-claude-chat",
        "aphrodite/KoboldAI/LLaMA2-13B-Tiefighter",
        "aphrodite/KoboldAI/LLaMA2-13B-TiefighterLR",
        "aphrodite/Undi95/MLewd-ReMM-L2-Chat-20B-Inverted",
        "aphrodite/Undi95/Xwin-MLewd-13B-V0.2",
        "aphrodite/NeverSleep/Echidna-13b-v0.1",
        "aphrodite/PygmalionAI/mythalion-13b",
        "aphrodite/NeverSleep/Echidna-13b-v0.3",
        "PygmalionAI/pygmalion-2-7b",
        "RossAscends/Mistral7B_Dolphin2.1_LIMARP0.5_4bpw_exl2",
        "aphrodite/Undi95/Emerhyst-20B"
    ],
    "disuedmodels": [
    ]
}
//END_OF_HORDE_PAREMETERS

var APICallParams = TabbyAPICallParams;

function updateUIUserList(userList) {
    console.debug(userList)
    console.log('populating user list...')
    const userListElement = $('#userList ul');
    userListElement.empty() // Clear the existing user list
    userList.forEach(username => {
        const listItem = `<li data-foruser="${username}" title="${username}">${username}</li>`;
        userListElement.append(listItem);
    });
}

function updateSelectedChar(char, type) {
    if (type === 'forced') {
        $("#characters").find(`option[value="${char}"]`).prop('selected', true).trigger('change')
    }
}

function updateSelectedSamplerPreset(preset, type) {
    if (type === 'forced') {
        $("#samplerPreset").find(`option[value="${preset}"]`).prop('selected', true).trigger('change')
    }
}

function processConfirmedConnection(parsedMessage) {
    console.log('--- processing confirmed connection...');
    const { selectedCharacter, selectedSamplerPreset, chatHistory, AIChatHistory, cardList, samplerPresetList, userList, isAutoResponse, contextSize, responseLength, engineMode } = parsedMessage;
    $("#AIAutoResponse").prop('checked', isAutoResponse)
    $("#maxContext").find(`option[value="${contextSize}"]`).prop('selected', true)
    $("#responseLength").find(`option[value="${responseLength}"]`).prop('selected', true)
    $("#chat").empty();
    $("#AIchat").empty();

    updateUIUserList(userList);
    if (userRole === 'Host') {
        populateCardSelector(cardList);
        populateSamplerSelector(samplerPresetList);
        console.debug(`selecting character as defined from server: ${selectedCharacter}`);
        updateSelectedChar(selectedCharacter, 'forced');
        updateSelectedSamplerPreset(selectedSamplerPreset, 'forced');
        setEngineMode(engineMode);
    }

    if (chatHistory) {
        const trimmedChatHistoryString = chatHistory.trim();
        const parsedChatHistory = JSON.parse(trimmedChatHistoryString);
        appendMessages(parsedChatHistory, "#chat");
    }

    if (AIChatHistory) {
        const trimmedAIChatHistoryString = AIChatHistory.trim();
        const parsedAIChatHistory = JSON.parse(trimmedAIChatHistoryString);
        appendMessagesWithConverter(parsedAIChatHistory, "#AIchat");
    }

    $("#chat").scrollTop($("#chat").prop("scrollHeight"));
    $("#AIchat").scrollTop($("#AIchat").prop("scrollHeight"));
    const connectionMessage = {
        type: 'connect',
        role: userRole,
        username: username
    };
    console.log('sending connection message..')
    socket.send(JSON.stringify(connectionMessage));
}

function appendMessages(messages, elementSelector) {
    messages.forEach((obj) => {
        const { username, userColor, content } = obj;
        const newDiv = $("<div></div>");
        newDiv.html(`<span style="color:${userColor}">${username}</span>:${content}`).append('<hr>');
        $(elementSelector).append(newDiv);
    });
}

function appendMessagesWithConverter(messages, elementSelector) {
    messages.forEach((obj) => {
        const { username, userColor, content } = obj;
        const message = converter.makeHtml(content);
        const newDiv = $("<div></div>");
        newDiv.html(`<span style="color:${userColor}">${username}</span>:${message}`).append('<hr>');
        $(elementSelector).append(newDiv);
    });
}

function connectWebSocket() {
    console.log(`trying to reconnect to ${serverUrl}`)
    socket = new WebSocket(serverUrl);
    console.log('socket made!')
    socket.onopen = handleSocketOpening;
    socket.onclose = disconnectWebSocket;
    // Handle incoming messages from the server
    socket.addEventListener('message', async function (event) {
        var message = event.data;
        console.log('Received message:', message);
        let parsedMessage = JSON.parse(message);
        const userList = parsedMessage.userList;

        switch (parsedMessage?.type) {
            case 'clearChat':
                $("#chat").empty()
                break;
            case 'clearAIChat':
                $("#AIchat").empty()
                break;
            case 'chatUpdate':
                console.log('saw chat update instruction');
                $("#AIchat").empty();
                let resetChatHistory = parsedMessage.chatHistory;
                resetChatHistory.forEach((obj) => {
                    let username = obj.username;
                    let userColor = obj.userColor;
                    let message = converter.makeHtml(obj.content);
                    let newDiv = $(`<div></div>`);
                    newDiv.html(`<span style="color:${userColor}">${username}</span>:${message}`).append('<hr>');
                    $("#AIchat").append(newDiv);
                });
                break;
            case 'cardList':
                let JSONCardData = parsedMessage.cards;
                await populateCardSelector(JSONCardData);
                break;
            case 'modeChange':
                setEngineMode(parsedMessage.engineMode);
                break;
            case 'userList':
            case 'userConnect':
            case 'userDisconnect':
                updateUIUserList(userList);
                break;
            case 'forceDisconnect':
                disconnectWebSocket();
                break;
            case 'connectionConfirmed':
                processConfirmedConnection(parsedMessage)
                break;
            case 'userChangedName':
                console.log('saw notification of user name change');
                var { type, content } = JSON.parse(message);
                const HTMLizedUsernameChangeMessage = converter.makeHtml(content);
                const sanitizedUsernameChangeMessage = DOMPurify.sanitize(HTMLizedUsernameChangeMessage);
                let newUsernameChatItem = $('<div>');
                newUsernameChatItem.html(`<i>${sanitizedUsernameChangeMessage}</i>`);
                newUsernameChatItem.append('<hr>');
                $("#chat").append(newUsernameChatItem).scrollTop($(`div[data-chat-id="${chatID}"]`).prop("scrollHeight"));
                break;
            case 'changeCharacter':
                if (isHost) {
                    return;
                }
                updateSelectedChar(parsedMessage.char, 'forced');
                break;
            case 'changeSamplerPreset':
                if (isHost) {
                    return;
                }
                updateSelectedSamplerPreset(parsedMessage.newPreset, 'forced');
                break;
            default:
                var { chatID, username, content, userColor, workerName, hordeModel, kudosCost } = JSON.parse(message);
                const HTMLizedMessage = converter.makeHtml(content);
                const sanitizedMessage = DOMPurify.sanitize(HTMLizedMessage);
                let newChatItem = $('<div>');
                newChatItem.html(`<span style="color:${userColor};">${username}</span>: ${sanitizedMessage}`);
                newChatItem.append('<hr>');
                if (workerName !== undefined && hordeModel !== undefined && kudosCost !== undefined) {
                    $(newChatItem).prop('title', `${workerName} - ${hordeModel} (Kudos: ${kudosCost})`);
                }
                $(`div[data-chat-id="${chatID}"]`).append(newChatItem).scrollTop($(`div[data-chat-id="${chatID}"]`).prop("scrollHeight"));
                break;
        }
    });
}

function handleSocketOpening() {
    console.log("WebSocket connected to server:", serverUrl);
    $("#reconnectButton").hide()
    $("#disconnectButton").show()
    const username = $("#usernameInput").val()
    console.debug(`connected as ${username}`)
    $("#messageInput").prop("disabled", false).prop('placeholder', 'Type a message').removeClass('disconnected')
    $("#AIMessageInput").prop("disabled", false).prop('placeholder', 'Type a message').removeClass('disconnected')
};

function disconnectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket disconnected from server:", serverUrl);
        $("#reconnectButton").show()
        $("#disconnectButton").hide()
        $("#userList ul").empty()
        $("#messageInput").prop("disabled", true).prop('placeholder', 'DISCONNECTED').addClass('disconnected');
        $("#AIMessageInput").prop("disabled", true).prop('placeholder', 'DISCONNECTED').addClass('disconnected');
        const disconnectMessage = {
            type: 'disconnect',
            username: username
        };
        socket.send(JSON.stringify(disconnectMessage));
        socket.close();
    }
}

function updateUserName() {
    let nameChangeMessage = {
        type: 'usernameChange',
        newName: $("#usernameInput").val(),
        oldName: username
    }
    username = $("#usernameInput").val()
    localStorage.setItem('username', username)
    console.log(`Set localstorage "username" key to ${username}`)
    socket.send(JSON.stringify(nameChangeMessage))
}

function doAIRetry() {
    let char = $('#characters').val();
    let retryMessage = {
        type: 'AIRetry',
        chatID: 'AIChat',
        username: username,
        APICallParams: APICallParams,
        char: char
    }
    socket.send(JSON.stringify(retryMessage))
}

//Just update Localstorage, no need to send anything to server for this.
//but possibly add it in the future if we want to let users track which user is speaking as which entity in AI Chat.
function updateAIChatUserName() {
    username = $("#AIUsernameInput").val()
    localStorage.setItem('AIChatUsername', username)
    console.log(`Set localstorage "AIChatUsername" key to ${username}`)
}

async function populateCardSelector(cardList) {
    //console.log(cardList)
    let cardSelectElement = $("#characters");
    cardSelectElement.empty()
    for (const card of cardList) {
        let newElem = $('<option>');
        newElem.val(card.filename);
        newElem.text(card.name);
        cardSelectElement.append(newElem);
    }
    if (!isHost) {
        $("#characters").prop('disabled', true);
    }
}

async function populateSamplerSelector(presetList) {
    console.log(presetList)
    let samplerSelectElement = $("#samplerPreset");
    samplerSelectElement.empty()
    for (const preset of presetList) {
        let newElem = $('<option>');
        newElem.val(preset.filename);
        newElem.text(preset.name);
        samplerSelectElement.append(newElem);
    }
    if (!isHost) {
        $("#characters").prop('disabled', true);
    }
}

// set the engine mode to either horde or tabby based on a value from the websocket
function setEngineMode(mode) {
    if (mode === 'horde') {
        $("#toggleMode").removeClass('tabbyMode').addClass('hordeMode').text('🧟');
        $("#toggleMode").attr('title', 'Click to switch to Tabby Mode');
        //copy the horde parameters into the APICallParams object
        APICallParams = JSON.parse(JSON.stringify(HordeAPICallParams));
        console.log('Switching to Horde Mode')
    } else {
        $("#toggleMode").removeClass('hordeMode').addClass('tabbyMode').text('🐈');
        $("#toggleMode").attr('title', 'Click to switch to Horde Mode');
        //copy the tabby parameters into the APICallParams object
        APICallParams = JSON.parse(JSON.stringify(TabbyAPICallParams));
        console.log('Switching to Tabby Mode')
    }
}

let isDisconnecting = false;
window.addEventListener('beforeunload', () => {
    if (!isDisconnecting) {
        // Send a disconnect message to the server before unloading the page
        disconnectWebSocket()
        isDisconnecting = true;
    }
});

$(document).ready(async function () {
    console.log('--- document is ready, processing entry....')

    connectWebSocket();

    var isPhone = /Mobile/.test(navigator.userAgent);
    //handle disconnect and reconnect
    $("#reconnectButton").off('click').on('click', function () {
        connectWebSocket()
    })
    $("#disconnectButton").off('click').on('click', function () {
        disconnectWebSocket()
    })

    $("#AIAutoResponse").on('input', function () {
        isAutoResponse = $(this).prop('checked')
        console.log(isAutoResponse)
        const autoResponseStateMessage = {
            type: 'toggleAutoResponse',
            value: isAutoResponse
        }
        socket.send(JSON.stringify(autoResponseStateMessage));
    })
    $("#maxContext").on('input', function () {
        contextSize = $(this).find(`option:selected`).val()
        console.log(contextSize)
        const adjustCtxMes = {
            type: 'adjustContextSize',
            value: contextSize
        }
        socket.send(JSON.stringify(adjustCtxMes));
    })
    $("#responseLength").on('input', function () {
        responseLength = $(this).find(`option:selected`).val()
        console.log(responseLength)
        const adjustResponseLength = {
            type: 'adjustResponseLength',
            value: responseLength
        }
        socket.send(JSON.stringify(adjustResponseLength));
    })

    // Send a message to the user chat
    $("#sendButton").off('click').on("click", function () {
        if ($("#usernameInput").val().trim() === '') {
            alert("Can't send chat message with no username!");
            return;
        }
        var messageInput = $("#messageInput");
        if (messageInput.val().trim() === '') {
            alert("Can't send empty message!");
            return;
        }
        username = $("#usernameInput").val();
        var markdownContent = `${messageInput.val()}`;
        var htmlContent = converter.makeHtml(markdownContent);
        var messageObj = {
            chatID: "UserChat",
            username: username,
            content: htmlContent,
        };
        messageObj = JSON.stringify(messageObj)
        localStorage.setItem('username', username);
        socket.send(messageObj);
        messageInput.val('');
        messageInput.trigger('focus');
    });
    //this just circumvents the logic of requiring a username and input message before pushing send.
    $("#triggerAIResponse").off('click').on("click", function () {
        $("#AISendButton").trigger('click')
    })

    $("#AIRetry").off('click').on('click', function () {
        doAIRetry()
    })

    $("#characters").on('change', function () {
        if (!isHost) {
            return
        }
        else {
            let newChar = String($("#characters").val())
            let changeCharacterMessage = {
                type: 'changeCharacter',
                newChar: newChar
            }
            socket.send(JSON.stringify(changeCharacterMessage));
        }
    })

    $("#samplerPreset").on('change', function () {
        if (!isHost) {
            return
        }
        else {
            let newPreset = String($("#samplerPreset").val())
            let changeSamplerPresetMessage = {
                type: 'changeSamplerPreset',
                newPreset: newPreset
            }
            socket.send(JSON.stringify(changeSamplerPresetMessage));
        }
    })

    //A clickable icon that toggles between tabby and horde mode, swaps the API parameters, and updates the UI and server to reflect the change.
    $("#toggleMode").off('click').on('click', function () {
        if (!isHost) {
            return
        }//A clickable icon that toggles between tabby and horde mode, swaps the API parameters, and updates the UI to reflect the change.
        else {
            let newMode = $("#toggleMode").hasClass('hordeMode') ? 'tabby' : 'horde';
            let modeChangeMessage = {
                type: 'modeChange',
                newMode: newMode
            }
            socket.send(JSON.stringify(modeChangeMessage));
        }
    })

    $("#usernameInput").on('blur', function () {
        console.log('saw username input blur')
        let oldUsername = localStorage.getItem('username');
        let currentUsername = $("#usernameInput").val()
        if (oldUsername !== currentUsername) {
            console.log('notifying server of UserChat username change...')
            updateUserName()
        }
    })

    $("#AIUsernameInput").on('blur', function () {
        //$("#usernameInput").trigger('change')
        updateAIChatUserName()
    })

    $("#AISendButton").off('click').on('click', function () {
        //hordeAPICallParams.params.stop_sequence = stoppingStrings;

        if ($("#AIUsernameInput").val().trim() === '') {
            alert("Can't send chat message with no username!");
            return;
        }

        var messageInput = $("#AIMessageInput");
        if (messageInput.val().trim() === '') {
            alert("Can't send empty message!");
            return;
        }
        username = $("#AIUsernameInput").val()
        let charDisplayName = $('#characters option:selected').text();
        //TODO: make this function grab usernames for all entities in chat history
        //and move it inside the Prompt crafting function
        //Move it to server-side. client side has no idea on its own.

        var markdownContent = `${messageInput.val()}`;
        var htmlContent = converter.makeHtml(markdownContent);
        var char = $('#characters').val();
        var stringToSend = markdownContent
        APICallParams.prompt = stringToSend;
        var websocketRequest = {
            chatID: 'AIChat',
            username: username,
            APICallParams: APICallParams,
            userInput: markdownContent,
        }
        localStorage.setItem('AIChatUsername', username);
        socket.send(JSON.stringify(websocketRequest));
        messageInput.val('');
        messageInput.trigger('focus');
    })

    $("#clearUserChat").off('click').on('click', function () {
        console.log('Clearing OOC Chat')
        const clearMessage = {
            type: 'clearChat'
        };
        socket.send(JSON.stringify(clearMessage));
    })

    $("#clearAIChat").off('click').on('click', function () {
        console.log('Clearing AI Chat')
        const clearMessage = {
            type: 'clearAIChat'
        };
        socket.send(JSON.stringify(clearMessage));
    })

    $("#deleteLastMessageButton").off('click').on('click', function () {
        console.log('deleting last AI Chat message')
        const delLastMessage = {
            type: 'deleteLast'
        }
        socket.send(JSON.stringify(delLastMessage));
    })
    $("#userRole").text(userRole)
    console.log(`Host? ${isHost}`)
    if (!isHost) {
        $(".hostControls").remove()
        $("#controlPanel").remove()
    }

    await startupUsernames()
    $("#usernameInput").val(username)
    $("#AIUsernameInput").val(AIChatUsername)

    $('#clearLocalStorage').on('click', function () {
        $("#usernameInput").val('')
        $("#AIUsernameInput").val('')
        localStorage.clear();
        alert('Deleted saved usernames!');
    });

    if (window.matchMedia("(orientation: landscape)").matches && /Mobile/.test(navigator.userAgent)) {
        if (isIOS) {
            $('body').css({
                'padding-left': '15px',
                'padding-right': '0px',
                'width': '100sfw',
                'height': 'calc(100svh - 36px)'
            })
        }
    }
    //do message send on Enter
    $("#messageInput").on("keypress", function (event) {
        if (event.which === 13) {
            if (event.shiftKey || event.metaKey) {
                // Ctrl+Enter was pressed, allow default behavior
                return;
            }
            event.preventDefault();
            $("#sendButton").click();
        }
    });
    //same for AI chat
    $("#AIMessageInput").on("keypress", function (event) {
        if (event.which === 13) {
            if (event.shiftKey || event.metaKey) {
                // Ctrl+Enter was pressed, allow default behavior
                return;
            }
            event.preventDefault();
            $("#AISendButton").trigger('click');
        }
    });

    $(window).on('orientationchange', function () {
        var orientation = window.orientation;
        if (isPhone && (orientation === 90 || orientation === -90)) {
            // Landscape orientation on iOS
            if (isIOS) {
                $('body').css({
                    'padding-left': '15px',
                    'padding-right': '0px',
                    'width': '100svw',
                    'height': 'calc(100svh - 36px)'
                })
            }
        } else {
            // Portrait orientation
            $('body').css({
                'padding': '0px',
                'height': '100svh'
            });
        }
    });
    console.log('connecting websocket..')
});