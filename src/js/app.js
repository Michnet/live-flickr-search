import fetchJsonp from 'fetch-jsonp';
import React from 'react';
import ReactDOM from 'react-dom';
import './../style/app.css';

const galleryMachine = {
  start: {
    SEARCH: 'loading'
  },
  loading: {
    SEARCH: 'loading',
    SEARCH_SUCCESS: 'gallery',
    SEARCH_FAILURE: 'error',
    CANCEL_SEARCH: 'gallery'
  },
  error: {
    SEARCH: 'loading'
  },
  gallery: {
    SEARCH: 'loading',
    SELECT_PHOTO: 'photo'
  },
  photo: {
    EXIT_PHOTO: 'gallery'
  }
};

class PhotoGallery extends React.Component {
  render() {

    let state = this.props.state;
    let galleryState = state.gallery;

    let noResults = state.items.length === 0;

    let resultToRender = null;

    if (galleryState === 'error') {
      resultToRender = (<span className="ui-error">Uh oh, search failed.</span>);
    } else if (noResults && state.query !== '' && galleryState === 'gallery') {
      resultToRender = (<span className="ui-no-results">Empty result, type something else.</span>);
    } else {
      resultToRender = (state.items.map((item, i) =>
        <img
          src={item.media.m}
          className="ui-item"
          style={{ '--i': i }}
          key={item.link}
          onClick={() => this.props.onPhotoClick(item)}
        />
      ));
    }

    return (
      <section className="ui-items" data-state={galleryState}>
        {resultToRender}
      </section>
    );
  }
}

class ZoomedPhoto extends React.Component {
  render() {
    if (this.props.state.gallery !== 'photo') return null;

    return (
      <section
        className="ui-photo-detail"
        onClick={this.props.onPhotoClick}>
        <img src={this.props.state.photo.media.m} className="ui-photo" />
      </section>
    );
  }
}


class App extends React.Component {

  constructor() {
    super();

    this.state = {
      gallery: 'start', // finite state
      query: '',
      items: [],
      fetchId: 0
    };
  }

  command(nextState, action) {
    switch (nextState) {
      case 'loading':
        // execute the search command
        this.search(action.query);
        break;
      case 'gallery':
        this.cancelFetch();
        if (action.items) {
          // update the state with the found items
          return { items: action.items };
        }
        break;
      case 'photo':
        if (action.item) {
          // update the state with the selected photo item
          return { photo: action.item };
        }
        break;
      default:
        break;
    }
  }

  transition(action) {
    const currentGalleryState = this.state.gallery;
    const nextGalleryState = galleryMachine[currentGalleryState][action.type];    

    if (nextGalleryState) {
      const nextState = this.command(nextGalleryState, action);

      this.setState({
        gallery: nextGalleryState,
        ...nextState
      });
    }
  }

  handleSubmit(e) {
    e.persist();
    e.preventDefault();
  }

  cancelFetch() {
    if (this.state.fetchId) {
      clearTimeout(this.state.fetchId);
    }
  }

  search = (query) => {
    const encodedQuery = encodeURIComponent(query);

    this.cancelFetch();

    const fetchTimeoutId = setTimeout(() => {
      fetchJsonp(
        `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${encodedQuery}`,
        { jsonpCallback: 'jsoncallback' })
        .then(res => res.json())
        .then(data => {
          this.transition({ type: 'SEARCH_SUCCESS', items: data.items });
        })
        .catch(error => {
          this.transition({ type: 'SEARCH_FAILURE' });
        })
        .then(() => {
          this.setState({ fetchId: null });
        });
    }, 2000);

    this.setState({ fetchId: fetchTimeoutId });
  }
  handleChangeQuery(value) {

    this.setState({ query: value });

    if (!value) {
      this.transition({ type: 'CANCEL_SEARCH' });
      return;
    }

    this.transition({ type: 'SEARCH', query: value });
  }
  renderForm(state) {
    const searchText = {
      loading: 'Searching...',
      error: 'Try search again',
      start: 'Search'
    }[state] || 'Search';

    const cancelButton = (state === 'loading' ? <button
      className="ui-button"
      type="button"
      onClick={() => this.transition({ type: 'CANCEL_SEARCH' })}>
      Cancel
              </button> : null);

    return (
      <form className="ui-form" onSubmit={e => this.handleSubmit(e)}>
        <h3>Type to start searching from Flickr's photos...</h3>
        <input
          type="search"
          className="ui-input"
          value={this.state.query}
          onChange={e => this.handleChangeQuery(e.target.value)}
          placeholder="type here..."
        />
        <div className="ui-buttons">
          {cancelButton}
        </div>
      </form>
    );
  }
  render() {
    const galleryState = this.state.gallery;

    return (
      <div className="ui-app" data-state={galleryState}>
        {this.renderForm(galleryState)}
        <PhotoGallery state={this.state} onPhotoClick={(item) => this.transition({ type: 'SELECT_PHOTO', item })} />
        <ZoomedPhoto state={this.state} onPhotoClick={() => this.transition({ type: 'EXIT_PHOTO' })} />
      </div>
    );
  }
}

ReactDOM.render(<App />, document.querySelector('#app'));