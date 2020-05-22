$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navAddStory = $("#nav-addStory")
  const $navFavs = $("#nav-seeFavorites")
  const $modal = $('#modal')

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  // more stories functionality
  window.onscroll = async function(ev) {
    if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight) {
        const skipNum = storyList.stories.length
        const moreStories = await StoryList.getMoreStories(skipNum)
        for (let story of moreStories) {
          storyList.stories.push(story)
          const result = generateStoryHTML(story);
          $allStoriesList.append(result);
        }




    }
};
  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    try{
    const userInstance = await User.login(username, password);
    currentUser = userInstance;
    }catch(e){
      return alert('wrong username or password')
    }
    // set the global user to the user instance
    
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val() 
    let password = $("#create-account-password").val();

    if(name === '' || password === '') {
      
      return alert('Please enter a name and password')
    }

    // call the create method, which calls the API and then builds a new user instance
    try {const newUser = await User.create(username, password, name);
      currentUser = newUser;
    }catch (e){
      
      const status = e.response.status;
      return status === 409 ? alert('Username already taken.'): alert('Oops. Something went wrong');
    };
    
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });
  /**
   * Add Story functionality that pops up a form in a modal
   * 
   */
  $navAddStory.on("click", function () {
    const $storyform = $(`<div id= "modalContent">
    <form id ="story-form">
        <h3>Add a Story</h3>
        <label for='storyTitle'>Title: </label>
        <input  id = "storyTitle" type = 'text'><br>
        <label for='storyAuthor'>Author: </label>
        <input  id = 'storyAuthor' type = 'text'><br>
        <label for='storyUrl'>Url: </label>
        <input  id ='storyUrl' type = 'url'><br>
        <input id='submitStory' type ='submit' value = 'Submit'>
    </form>
    </div>`)
    $(".modal-content").append($storyform)
    $(".modal-content").prepend('<span class="close" id="closeModal">&times;</span>')
    $('#closeModal').on('click', () => {
      $modal.hide()
      $('.modal-content').empty()
    })
    $('#submitStory').on('click', async (evt) => {
      evt.preventDefault()

      const storyObj = {
        author: $('#storyAuthor').val(),
        title: $('#storyTitle').val(),
        url: $('#storyUrl').val(),
        username: currentUser.username
      }
      
      try {
        const story = await storyList.addStory(currentUser, storyObj)
        generateStories()// call to append most recent story
        $modal.hide()
        $('.modal-content').empty()
      } catch {
        alert("Make sure you have an author, a title, and proper url including 'http://'!")
      }

    })
    $modal.show()
  })



  /**
   * Modal Closing Code Below
   * 
   */
  $(document).on('click', (evt) => {
    if (evt.target.id == 'modal') {
      $modal.hide()
      $('.modal-content').empty()
    }
  })





  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    generateStories()
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);



    }
    // $('li').on('mouseenter mouseleave', (evt)=>{
    //   const span = evt.target.children[1]
    //   $(span).toggle()
    // })
    
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let fav = false
    //checking if there is a current user to display favorites
    if(currentUser){
      for( favorite of currentUser.favorites){
        if(favorite.storyId === story.storyId){
          fav = true
        } 
      }
    }
    const star = fav ? '&#x2605;' : '&#x2606;';

    // render story markup
    const storyMarkup = $(`
    
      <li id="${story.storyId}">
      <span data-name= 'favorite'>${localStorage.token ? star : ''}</span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        
        <small class="article-author" >by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        
      </li>
    `);
    if(currentUser){ currentUser.username === story.username ?storyMarkup.append('<span class = "delete" data-name="delete">&times;<span>'):false;}
    storyMarkup.append(`<small class="article-username">posted by ${story.username}</small>`)
    
    return storyMarkup;
  }

  // /* favoriting functions

  $navFavs.on('click', async (evt)=>{
    $allStoriesList.empty();
    for(story of currentUser.favorites){
      const result = generateStoryHTML(story)
      $allStoriesList.append(result)

    }
  })

  $allStoriesList.on('click', async (evt) =>{
    
    const target = evt.target
  
    if(target.dataset.name === 'favorite'){
      const parentId = target.parentNode.id
      const favorite = checkIfFavorite(currentUser,target.parentNode.id)
      
      if(!favorite) {
        const newFav = await User.postFavorites(currentUser, parentId)
        
        currentUser.favorites = newFav.user.favorites
        $(target).html(' &#x2605; ')
      } else {
        //code for remove favorite here
        const deleteFav = await User.removeFavorite(currentUser, parentId)
        
        $(target).html(' &#x2606; ')
      }
    }
    if(target.dataset.name === 'delete'){
      const parentId = target.parentNode.id
      deleteAlert(currentUser,parentId)
    }
  })

  const checkIfFavorite = (user,id) => {
    for ( favorite of user.favorites){
      if ( favorite.storyId === id) return true;
    }
    
    return false

  };
  
  /**
   * deleting stories UI functionality
   */

   const deleteAlert = (user,id) => {
      //confirm desire to delete

      const alert = $(`<h2> Are you sure you want to delete this story?</h2>
          <button id = 'yesDel'>Yes</button>
          <button id= 'noDel'>No</button>`)
      $modal.show()
      $('.modal-content').append(alert)
      $('#yesDel').on('click', async(evt) =>{
        const response = await removeStory(user,id)
        $('.modal-content').empty()
        $modal.hide()
        return response
      })
      $('#noDel').on('click', ()=>{
        $('.modal-content').empty()
        $modal.hide()
      })
      

   }

   const removeStory = async (user, id) => {
      const response = await StoryList.deleteStory(user,id)
      $(`#${id}`).remove()
   }

  
  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navAddStory.show();
    $navFavs.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
