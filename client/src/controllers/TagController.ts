import $ from 'jquery';

import { Controller } from '@hotwired/stimulus';
import { debounce } from '../utils/debounce';

declare global {
  interface JQuery {
    tagit: (options: Record<string, any> | string) => void;
  }
}

/**
 * Attach the jQuery tagit UI to the controlled element.
 *
 * See https://github.com/aehlke/tag-it
 *
 * @example
 * <input id="id_tags" type="text" name="tags" data-controller="w-tag" data-w-tag-url-value="/admin/tag-autocomplete/" />
 */
export class TagController extends Controller {
  static values = {
    options: { default: {}, type: Object },
    url: String,
    debounce: { type: Number, default: 400 },
  };

  declare optionsValue: any;
  declare urlValue: any;
  declare debounceValue: number;
  tagit?: JQuery<HTMLElement>;

  connect() {
    const preprocessTag = this.cleanTag.bind(this);
    // Debounces by specified debounceValue to reduce unnecessary calls to database while user types
    const debouncedAutocomplete = debounce(
      this.autocomplete,
      this.debounceValue,
    );

    $(this.element).tagit({
      autocomplete: { source: debouncedAutocomplete },
      preprocessTag,
      ...this.optionsValue,
    });
}

autocomplete(request: { term: string }, response: (data: any) => void) {
  $.ajax({
    url: this.urlValue,
    dataType: 'json',
    data: { term: request.term },
    success: response,
  });
}
  /**
   * Double quote a tag if it contains a space
   * and if it isn't already quoted.
   */
  cleanTag(val: string) {
    return val && val[0] !== '"' && val.indexOf(' ') > -1 ? `"${val}"` : val;
  }

  /**
   * Method to clear all the tags that are set.
   */
  clear() {
    $(this.element).tagit('removeAll');
  }
}
