/* -- Helper Functions -- */
// validation function for input fields
function validateSearchInput(title, year) {
  // check title
  if (!title || title.trim() === '') {
    return { ok: false, message: 'Title is required.' };
  }
  // check year if provided enforce 4 digits
  if (year && year.trim() !== '' && !/^\d{4}$/.test(year.trim())) {
    return { ok: false, message: 'Year must be 4 digits (or leave blank).' };
  }

  return { ok: true, message: '' };
}

// countdown when picking a movie
function runCountdown(seconds, onTick, onDone) {
  let remaining = seconds;
  onTick(remaining);

  const id = setInterval(function() {
    remaining -= 1;

    if (remaining <= 0) {
      clearInterval(id);
      onDone();
    } else {
      onTick(remaining);
    }
  }, 1000); 

  return id;
}


/* -- Classes -- */
class MovieService {

  static baseUrl() {
    return 'https://www.omdbapi.com/';
  }
  
  static buildSearchUrl(title, year) {
    // create URL params object
    const params = new URLSearchParams();
    params.set('apikey', API_KEY);
    params.set('s', title);
    // if year provided add to params
    if (year && year.trim() !== '') {
      params.set('y', year.trim());
    }
    // returns combined baseURL and params  
    return MovieService.baseUrl() + '?' + params.toString();
  }

  static search(title, year) {
    //calls on buildSearchUrl to get full URL
    const url = MovieService.buildSearchUrl(title, year);
    console.log('Searching OMDB with URL:', url);
    // uses fetch method to get data
    return fetch(url).then(function(res) {
      if (!res.ok) throw new Error('Network error');
      //if response ok, return json data
      return res.json();
    });
  }
}

class Watchlist {
  //Create a new movieWatchlist in localStorage with given key
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.items = [];
  }
  // load movieWatchlist from localStorage
  load() {
    const raw = localStorage.getItem(this.storageKey);
    this.items = raw ? JSON.parse(raw) : [];
  }
  // save watchlist to localStorage
  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }
  // add a movie to watchlist
  add(movie) {
    const exists = this.items.some(function(m) {
      return m.imdbID === movie.imdbID;
    });

    if (!exists) {
      //add to watchlist if does not already exist with default watched = false
      const movieToAdd = Object.assign({}, movie);
      if (typeof movieToAdd.watched === 'undefined') {
        movieToAdd.watched = false;
      }
      this.items.push(movieToAdd);
      this.save();
    }
  }
  // remove movie from watchlist
  remove(imdbID) {
    this.items = this.items.filter(function(m) {
      return m.imdbID !== imdbID;
    });
    this.save();
  }
  // pick a random movie from watchlist not marked as watched (not crossed off)
  randomPick() {
    // Only choose movies not watched 
    const unwatched = this.items.filter(function(m) {
      return !m.watched;
    });

    if (unwatched.length === 0) {
      return null;
    }

    const idx = Math.floor(Math.random() * unwatched.length);
    return unwatched[idx];
  }
}



// DOM references
const formEl = document.getElementById('search-form');
const titleEl = document.getElementById('title');
const yearEl = document.getElementById('year');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const watchlistEl = document.getElementById('watchlist');
const pickBtnEl = document.getElementById('pick-btn');
const countdownEl = document.getElementById('countdown');
const pickedEl = document.getElementById('picked');


// App 
const watchlist = new Watchlist('movieWatchlist');
watchlist.load();
renderWatchlist();


// Event listeners
formEl.addEventListener('submit', function(e) {
  //stop form submission
  e.preventDefault();

  // clear previous errors and results
  errorEl.textContent = '';
  resultsEl.innerHTML = '';

  //read form values
  const title = titleEl.value;
  const year = yearEl.value;

  // clear previous validation .css styles
  titleEl.classList.remove('invalid');
  yearEl.classList.remove('invalid');

  const validation = validateSearchInput(title, year);
  if (!validation.ok) {
    errorEl.textContent = validation.message;
    // test title if invalid
    if (!title || title.trim() === '') {
      titleEl.classList.add('invalid');
    }
    // test year is entered and valid
    if (year && year.trim() !== '' && !/^\d{4}$/.test(year.trim())) {
      yearEl.classList.add('invalid');
    }

    return;
  }

  resultsEl.textContent = 'Searching...';

  //call API via MovieService.search
  MovieService.search(title.trim(), year.trim())
    .then(function(data) {
      //if no data or Response is False, render no results
      if (!data || data.Response === 'False') {
        renderResults([]);
        return;
      }
      // call renderResults with data.Search array
      renderResults(data.Search);
    })
    .catch(function(err) {
      console.error(err);
      resultsEl.textContent = 'Error fetching movies.';
    });
});

// pick a movie button clicked hadler
pickBtnEl.addEventListener('click', function() {
  
  // clear previous pick and countdown
  pickedEl.textContent = '';
  countdownEl.textContent = '';

  // call radomPick method of Watchlist
  const pick = watchlist.randomPick();

  // if no pick available show message why and return
  if (!pick) {
    if (watchlist.items.length === 0) {
      countdownEl.textContent = 'Your watchlist is empty.';
    } else {
      countdownEl.textContent = 'All movies are marked as watched.';
    }
    return;
  }

  // pick is available, run countdown from 3
  runCountdown(3, function(t) {
      countdownEl.textContent = 'Picking in ' + t + '...';
    },
    function() {
      countdownEl.textContent = '';
      // show picked movie
      pickedEl.textContent = 'Tonight\'s Pick: ' + pick.Title + ' (' + pick.Year + ')';
      // save last pick to localStorage
      localStorage.setItem('movieWatchlistLastPick', JSON.stringify(pick));
    }
  );
});


// Render functions for search results
function renderResults(movies) {
  resultsEl.innerHTML = '';

  //if no movies, create <p> element with no results message and return
  if (!movies || movies.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No results found.';
    resultsEl.appendChild(p);
    return;
  }

  
  // loop through movies from search resutls
  for (let i = 0; i < movies.length; i += 1) {
    const m = movies[i];

    //create card for each movie
    const card = document.createElement('div');
    card.className = 'card';

    // Poster (if available)
    const movieTitle = m.Title;
    const posterUrl = m.Poster;

    const img = document.createElement('img');
    img.alt = movieTitle + ' poster';
    img.style.width = '80px';
    img.style.display = 'block';
    img.style.marginBottom = '6px';

    // attempt to catch broken image links
    img.onerror = function() {
      console.warn('Image failed to load for:', movieTitle, 'URL was:', img.src);
      // prevent infinite loop
      img.onerror = null;
      img.src = 'images/no-poster.png';
    };
    
    // if poster exista and is not 'N/A', use it; else use placeholder
    if (posterUrl && posterUrl !== 'N/A') {
      console.log('Poster found for:', movieTitle, 'URL:', posterUrl);
      img.src = posterUrl;
    } else {
      console.warn('No poster available for:', movieTitle);
      img.src = 'images/no-poster.png';
    }

    //add img to card
    card.appendChild(img);

    //contstruct title element
    const title = document.createElement('div');
    title.textContent = m.Title + ' (' + m.Year + ')';

    // add "Add" button with event handler to add movie to watchlist
    const button = document.createElement('button');
    button.textContent = 'Add';

    button.addEventListener('click', function () {
      watchlist.add(m);
      renderWatchlist();
    });

    // append title and button to card, and card to results
    card.appendChild(title);
    card.appendChild(button);
    resultsEl.appendChild(card);
  }
}

function renderWatchlist() {
  // clear previous watchlist
  watchlistEl.innerHTML = '';

  // if no items, create <p> element with empty message and return
  if (watchlist.items.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Empty Watchlist.';
    watchlistEl.appendChild(p);
    return;
  }

  // loop through watchlist items
  for (let i = 0; i < watchlist.items.length; i += 1) {
    const m = watchlist.items[i];

    // create card for each watchlist item to hold title and remove button
    const card = document.createElement('div');
    // creates css class
    card.className = 'watchlist-card';
    // set data-imdbid attribute for jQuery use
    card.setAttribute('data-imdbid', m.imdbID);

    // construct title element
    const title = document.createElement('div');
    title.textContent = m.Title + ' (' + m.Year + ')';
    title.className = 'watchlist-title';

    // If this movie is marked watched in data, reflect it in the UI
    if (m.watched) {
      title.classList.add('watched');
    }

    // add "Remove" button
    const button = document.createElement('button');
    button.textContent = 'Remove';
    button.className = 'remove-btn';

    // append title and button to card, and card to watchlist
    card.appendChild(title);
    card.appendChild(button);
    watchlistEl.appendChild(card);
  }
}



// jQuery for watchlist
$(document).ready(function () {

  // finds element with id=watchlist
  const $watchlist = $('#watchlist');

  // Click title to cross off / uncross (and update data)
  $watchlist.on('click', '.watchlist-title', function () {
    const $title = $(this);
    const $card = $title.closest('.watchlist-card');
    const imdbID = $card.attr('data-imdbid');

    // Toggle CSS
    $title.toggleClass('watched');

    // Toggle watched in data model
    for (let i = 0; i < watchlist.items.length; i += 1) {
      if (watchlist.items[i].imdbID === imdbID) {
        watchlist.items[i].watched = !watchlist.items[i].watched;
        break;
      }
    }

    // saves to localStorage by calling watchlist.save()
    watchlist.save();
  });

  // Click "Remove" button to delete from watchlist (and re-render)
  $watchlist.on('click', '.remove-btn', function (e) {
    e.preventDefault();
    e.stopPropagation();

    // find closest .watchlist-card and get imdbID
    const $card = $(this).closest('.watchlist-card');
    const imdbID = $card.attr('data-imdbid');
    
    // remove from watchlist data
    watchlist.remove(imdbID);
    // re-render watchlist
    renderWatchlist();
  });
});

