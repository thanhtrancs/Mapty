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
    return this;
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

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);

// console.log(run1);
// console.log(cycle1);

////////////////////////////////////////////////////////////////////
// Application Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let edit = false;
let currentWorkout;
let currentWorkoutEl;

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    document.addEventListener('click', e => {
      if (
        e.target &&
        e.target.className === 'button__icon button__icon--edit'
      ) {
        edit = true;
        this._editWorkout(e);
      }
    });
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
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    console.log(edit);
    e.preventDefault();

    const validInput = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositives = (...inputs) => inputs.every(input => input > 0);
    if (!edit) {
      // const validInput = (...inputs) =>
      //   inputs.every(input => Number.isFinite(input));

      // const allPositives = (...inputs) => inputs.every(input => input > 0);

      // e.preventDefault();
      // console.log(this);

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
      // console.log(this.#workouts);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Hide form + clear input fields
      this._hideForm();

      // Set local storage
      this._setLocalStorage();
    } else {
      // console.log('Editting!!!!!!');
      // Modify existed workout

      // console.log(this);

      // Get data from form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;

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

        // Update current Running object
        // workout = new Running([lat, lng], distance, duration, cadence);
        console.log(currentWorkout);
        currentWorkout.distance = distance;
        currentWorkout.duration = duration;
        currentWorkout.cadence = cadence;
        console.log(currentWorkout);
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

        // Update current Cycling object
        // workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      currentWorkoutEl.classList.remove('hidden');
      // Hide form + clear input fields
      this._hideForm();

      // Set local storage
      this._setLocalStorage();
    }
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
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
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
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

    form.insertAdjacentHTML('afterend', html);

    // editButton = document.querySelector('.button__icon--edit');
    // deleteButton = document.querySelector('.button__icon--delete');

    // editButton.addEventListener('click', this._editWorkout);
    // document.addEventListener('click', e => {
    //   if (
    //     e.target &&
    //     e.target.className === 'button__icon button__icon--edit'
    //   ) {
    //     this._editWorkout();
    //   }
    // });
  }

  _editWorkout(e) {
    // 1. Find the workout data that needs to be modified
    currentWorkoutEl = e.target.closest('.workout');

    if (!currentWorkoutEl) return;

    currentWorkout = this.#workouts.find(
      work => work.id === currentWorkoutEl.dataset.id
    );

    // 2. Save the data in variables to show in form
    const { distance, duration } = currentWorkout;
    let pace, cadence, elevationGain;

    if (currentWorkout.type === 'running') {
      pace = currentWorkout.pace;
      cadence = currentWorkout.cadence;
    } else {
      ({ elevationGain } = currentWorkout);
      this._toggleElevationField();
    }

    // 3. Hide current workout details and replace with
    // filled current data on form
    inputType.value = currentWorkout.type;
    form.classList.remove('hidden');
    currentWorkoutEl.classList.add('hidden');
    inputDistance.value = distance;
    inputDuration.value = duration;
    if (cadence) inputCadence.value = cadence;
    if (elevationGain) inputElevation.value = elevationGain;

    // 4. Update workout data, hide form, and show workout details
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

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
