import $ from 'jquery';
import { Application } from '@hotwired/stimulus';
import { TagController } from './TagController';
import { debounce } from '../utils/debounce';

window.$ = $;

describe('TagController', () => {
  let application;
  let element;

  const tagitMock = jest.fn(function innerFunction() {
    element = this;
  });

  window.$.fn.tagit = tagitMock;

  element = null;

  beforeAll(() => {
    application = Application.start();
    application.register('w-tag', TagController);
  });

  beforeEach(() => {
    element = null;
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]), // mocked response data
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should attach the jQuery tagit to the controlled element', async () => {
    document.body.innerHTML = `
      <form id="form">
        <input
          id="id_tags"
          type="text"
          name="tags"
          data-controller="w-tag"
          data-action="example:event->w-tag#clear"
          data-w-tag-options-value="{&quot;allowSpaces&quot;:true,&quot;tagLimit&quot;:10}"
          data-w-tag-url-value="/admin/tag-autocomplete/"
        >
      </form>`;

    expect(tagitMock).not.toHaveBeenCalled();

    await new Promise(requestAnimationFrame);

    expect(tagitMock).toHaveBeenCalledWith({
      allowSpaces: true,
      autocomplete: { source: expect.any(Function) },
      preprocessTag: expect.any(Function),
      tagLimit: 10,
    });

    expect(element[0]).toEqual(document.getElementById('id_tags'));

    const [{ preprocessTag }] = tagitMock.mock.calls[0];
    expect(preprocessTag).toBeInstanceOf(Function);
    expect(preprocessTag('"flat white"')).toEqual(`"flat white"`);
    expect(preprocessTag('caffe latte')).toEqual(`"caffe latte"`);

    document.getElementById('id_tags').dispatchEvent(new CustomEvent('example:event'));
    await new Promise(requestAnimationFrame);
    expect(tagitMock).toHaveBeenCalledWith('removeAll');
  });

  it('should handle a successful fetch response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(['tag1', 'tag2', 'tag3']),
      })
    );

    const controller = new TagController();
    controller.urlValue = '/admin/tag-autocomplete/'; // Set urlValue manually
    const mockResponse = jest.fn();

    await controller.autocomplete({ term: 'tag' }, mockResponse);

    expect(global.fetch).toHaveBeenCalledWith('/admin/tag-autocomplete/?term=tag', expect.any(Object));
    expect(mockResponse).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
  });

  it('should handle an empty fetch response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      })
    );

    const controller = new TagController();
    controller.urlValue = '/admin/tag-autocomplete/'; // Set urlValue manually
    const mockResponse = jest.fn();

    await controller.autocomplete({ term: 'nonexistent' }, mockResponse);

    expect(global.fetch).toHaveBeenCalledWith('/admin/tag-autocomplete/?term=nonexistent', expect.any(Object));
    expect(mockResponse).toHaveBeenCalledWith([]);
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Fetch error')));

    const controller = new TagController();
    controller.urlValue = '/admin/tag-autocomplete/'; // Set urlValue manually
    const mockResponse = jest.fn();

    await controller.autocomplete({ term: 'error' }, mockResponse);

    expect(global.fetch).toHaveBeenCalledWith('/admin/tag-autocomplete/?term=error', expect.any(Object));
    expect(mockResponse).toHaveBeenCalledWith([]);
  });

  it('should debounce API calls', async () => {
    jest.useFakeTimers(); // Use fake timers to control debounce timing
  
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(['tag1', 'tag2']), // Mocked response data
      })
    );
  
    const controller = new TagController();
    controller.urlValue = '/admin/tag-autocomplete/'; // Manually set urlValue for the test
    const mockResponse = jest.fn();
  
    // Use the debounced autocomplete function and call it twice in quick succession
    const debouncedAutocomplete = controller.autocomplete.bind(controller);
    debouncedAutocomplete({ term: 'debounced call' }, mockResponse);
    debouncedAutocomplete({ term: 'debounced call' }, mockResponse);
  
    // Move forward in time to trigger the debounce function
    jest.advanceTimersByTime(controller.debounceValue);
  
    // Await to allow any asynchronous calls to resolve
    await Promise.resolve();
  
    // Verify fetch was only called once due to debounce
    expect(global.fetch).toHaveBeenCalledTimes(1);
  
    // Verify that mockResponse was called with the correct data
    expect(mockResponse).toHaveBeenCalledWith(['tag1', 'tag2']);
  });
  
  
  
});
