'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//--------------------Application Architecture----------------------
const form = document.querySelector('.form');
const formContainer = document.querySelector('.form__container');
const buttonsTop = document.querySelector('.buttons__container');
const buttonDeleteAll = document.querySelector('.button__top--delete');
const buttonClose = document.querySelector('.button__close__form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #edit = false;
  #currentWorkout;
  #currentWorkoutEl;
  #markers = [];

  // #formPosition;
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._manageWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    document.addEventListener('click', e => {
      if (
        e.target &&
        e.target.className === 'button__icon button__icon--edit'
      ) {
        this._editWorkout(e);
      }

      if (
        e.target &&
        e.target.className === 'button__icon button__icon--delete'
      ) {
        this._deleteWorkout(e);
      }
    });

    buttonClose.addEventListener('click', this._hideForm.bind(this));

    buttonDeleteAll.addEventListener(
      'click',
      this._deleteAllWorkouts.bind(this)
    );

    if (this.#workouts.length > 0) {
      this._toggleHiddenButtons();
    }
    // this.#formPosition = formContainer.getBoundingClientRect();
    // this.reset();
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    //   console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    formContainer.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    formContainer.style.display = 'none';
    formContainer.classList.add('hidden');

    // setTimeout(() => (form.style.display = 'grid'), 1000);
    setTimeout(() => (formContainer.style.display = 'flex'), 1000);

    if (this.#edit) {
      this._toggleDisabledButtons();
      // this.#currentWorkoutEl.classList.remove('hidden');
    }
  }

  _toggleHiddenButtons() {
    buttonsTop.classList.toggle('hidden');
  }

  _toggleDisabledButtons() {
    document.querySelectorAll('.button__icon').forEach(el => {
      el.disabled = !el.disabled;
    });
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _manageWorkout(e) {
    e.preventDefault();

    const validInput = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositives = (...inputs) => inputs.every(input => input > 0);

    if (!this.#edit) {
      // Get data from form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const { lat, lng } = this.#mapEvent.latlng;

      let workout;

      // If workout is running, create Running object
      if (type === 'running') {
        const cadence = +inputCadence.value;
        // Check if data is valid
        if (
          !validInput(distance, duration, cadence) ||
          !allPositives(distance, duration, cadence)
        )
          return alert('Number has to be positive numbers!');

        workout = new Running([lat, lng], distance, duration, cadence);
      }

      // If workout is cycling, create Cycling object
      if (type === 'cycling') {
        // Check if data is valid
        const elevation = +inputElevation.value;
        if (
          !validInput(distance, duration, elevation) ||
          !allPositives(distance, duration, elevation)
        )
          return alert('Number has to be positive numbers!');

        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Hide form + clear input fields
      this._hideForm();

      // Set local storage
      this._setLocalStorage();

      // Show sort and delete buttons
      // if (buttonsTop.classList.contains('hidden')) {
      //   buttonsTop.classList.remove('hidden');
      // }
      this._toggleHiddenButtons();
    } else {
      // Modify existed workout
      // Get data from form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;

      this.#currentWorkout.distance = distance;
      this.#currentWorkout.duration = duration;

      // If workout is running, create Running object
      if (type === 'running') {
        const cadence = +inputCadence.value;
        // Check if data is valid
        if (
          !validInput(distance, duration, cadence) ||
          !allPositives(distance, duration, cadence)
        )
          return alert('Number has to be positive numbers!');

        // Update Running object
        this.#currentWorkout.cadence = cadence;
        this.#currentWorkout.pace = duration / distance;
      }

      // If workout is cycling, create Cycling object
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        // Check if data is valid

        if (
          !validInput(distance, duration, elevation) ||
          !allPositives(distance, duration, elevation)
        )
          return alert('Number has to be positive numbers!');

        // Update Cycling object
        this.#currentWorkout.elevationGain = elevation;
        this.#currentWorkout.speed = distance / duration;
      }

      this.#currentWorkoutEl.classList.remove('hidden');

      const newMarkup = this._generateMarkup(this.#currentWorkout);
      const newDOM = document.createRange().createContextualFragment(newMarkup);
      const newElements = Array.from(newDOM.querySelectorAll('*'));
      const currentElements = Array.from(
        this.#currentWorkoutEl.querySelectorAll('*')
      );

      newElements.splice(0, 1);
      newElements.forEach((newEl, i) => {
        const currentEl = currentElements[i];

        // Update changed TEXT
        if (
          !newEl.isEqualNode(currentEl) &&
          newEl.firstChild?.nodeValue.trim() !== ''
        ) {
          currentEl.textContent = newEl.textContent;
        }
      });

      this.#edit = false;
      if (!this.#edit) {
        this._toggleDisabledButtons();
      }

      // Hide form + clear input fields
      this._hideForm();

      // Set local storage
      this._setLocalStorage();
    }
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      );

    marker
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#markers.push(marker);
  }

  _generateMarkup(workout) {
    let html = `
    <div class="workout__container">
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        
        <h2 class="workout__title">${workout.description}</h2>
        <div class="buttons__icon">
        <button class="button__icon button__icon--edit">🖊</button>
        <button class="button__icon button__icon--delete">🗑</button>
        </div>
        
        <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
        </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }

    html += `</div>`;

    return html;
  }

  _renderWorkout(workout) {
    // formContainer.insertAdjacentHTML('afterend', this._generateMarkup(workout));
    const workoutEl = document
      .createRange()
      .createContextualFragment(this._generateMarkup(workout));
    containerWorkouts.insertBefore(workoutEl, containerWorkouts.firstChild);
  }

  _editWorkout(e) {
    this.#edit = true;

    // Disabled all edit buttons after one is clicked
    if (this.#edit) {
      this._toggleDisabledButtons();
    }

    // 1. Find the workout data that needs to be modified
    this.#currentWorkoutEl = e.target.closest('.workout__container');
    // console.log(this.#currentWorkoutEl);

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    this.#currentWorkout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // 2. Save the data in variables to show in form
    const { distance, duration } = this.#currentWorkout;
    let cadence, elevationGain;

    if (this.#currentWorkout.type === 'running') {
      ({ cadence } = this.#currentWorkout);
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    } else {
      ({ elevationGain } = this.#currentWorkout);
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
    }

    // 3. Hide current workout details and replace with
    // filled current data on form
    inputType.value = this.#currentWorkout.type;
    const workoutPosition = this.#currentWorkoutEl.getBoundingClientRect();
    // form.style.y = workoutPosition.y + 'px';
    // console.log(workoutPosition, this.#formPosition);
    // formContainer.style.top = `${workoutPosition.top}px`;
    // formContainer.style.left = `${workoutPosition.left}px`;
    // console.log('after: ', this.#formPosition);
    // this.#currentWorkoutEl.classList.add('hidden');
    formContainer.classList.remove('hidden');
    inputDistance.value = distance;
    inputDuration.value = duration;
    if (cadence) inputCadence.value = cadence;
    if (elevationGain) inputElevation.value = elevationGain;
  }

  _deleteAllWorkouts() {
    localStorage.removeItem('workouts');
    this.#workouts.splice(0, this.#workouts.length);
    document.querySelector('.workouts').innerHTML = '';
    this._toggleHiddenButtons();
    this.#markers.forEach(marker => this.#map.removeLayer(marker));
  }

  _deleteWorkout(e) {
    // 1. Select the workout that needs to be deleted
    this.#currentWorkoutEl = e.target.closest('.workout__container');

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    // 2. Delete the workout from workouts array
    this.#workouts.splice(
      this.#workouts.findIndex(work => work.id === workoutEl.dataset.id),
      1
    );
    // console.log(this.#workouts);

    // 3. Delete the workout from local storage
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animation: true,
      pan: {
        duration: 1,
      },
    });

    // public interface
    // workout.click();
    // console.log(workout);
  }

  _setLocalStorage() {
    // Convert objects to string to store in local storage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    // console.log(this.#workouts);
  }

  _getLocalStorage() {
    // Convert string to objects
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
