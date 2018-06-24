//Emoji datasource
const emoji = require("emojilib");
//Regex expression chosen to identify the string as emoji label
const regexExpression = /(\:[\w\-\+]+)/g;
//emoji array
let emojis = null;
//current search text
let currentSearch = '';

// Function to load all the emojis from the data source
function load() {
    if (emojis) return emojis;
    
    var result = emoji.lib;  
    emojis = Object.keys(result).map(function(key) {
        return [key, result[key]];
      });      
  }

  // Function to retrieve all the emojis that match with the search string
 function getChars(emojiId) {
    const emojiMap = emojis;
  
    if (emojiMap == null) {
      return null;
    }
    
    return emojis.filter(function(k){
        return k[0].indexOf(emojiId) === 0
    });
  }

  // Function to check if search string is part of an emoji label
  function exist(emojiId) {
    const emojiMap = emojis;
  
    if (emojiMap == null) {
      return false;
    }
  
    return emojiMap.some(function(k){
        return ~k[0].indexOf(emojiId)
    });
  }

  // Function responsible for parsing the text 
  //from the message into the emoji label and search the emoji datasource  
  function parse(text, element){
    if(text == undefined || text == "")
        return;

    let output = '';
    let env = this;
    env.currentSearch = text;

    output += text.replace(regexExpression, match => {
        const name = match.replace(/:/g, '');
        
        if (!exist(name)) {
            return match;
        } 
        var icons = getChars(name);

        var list = buildDropdown(icons, env);
        element.appendChild(list);
    });  
  }

  // Function to construct the emoji dropdown resultant from the search
  function buildDropdown(array, env){
    var list = document.createElement('ul');
    list.className = "textcomplete-dropdown";
    list.id = "emoji-options";
    
    for(var i = 0; i < array.length; i++) {
        var opt = array[i];

        var li = document.createElement('li');
        li.innerHTML = `<li class="textcomplete-item">${opt[0]} <span class="emoji">${opt[1].char}</span></li>`;
      
        li.addEventListener("click", function(){
            var text = document.querySelectorAll('[data-text="true"]')[0];
            text.innerHTML = text.innerHTML.replace(env.currentSearch,'');
            text.innerHTML += this.firstChild.firstElementChild.innerHTML;
            
            document.getElementById("emoji-options").remove();
            //document.querySelector('._5rpu').focus();
        });

        list.appendChild(li);
    }

    return list;
  }

exports.load = load;
exports.parse = parse;