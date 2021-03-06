'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');

var _require = require('react-dom'),
    findDOMNode = _require.findDOMNode;

var scrollIntoView = require('dom-scroll-into-view');

var _debugStates = [];

var Autocomplete = React.createClass({
  displayName: 'Autocomplete',


  propTypes: {
    /**
     * The items to display in the dropdown menu
     */
    items: React.PropTypes.array.isRequired,
    /**
     * The value to display in the input field
     */
    value: React.PropTypes.any,
    /**
     * Arguments: `event: Event, value: String`
     *
     * Invoked every time the user changes the input's value.
     */
    onChange: React.PropTypes.func,
    /**
     * Arguments: `value: String, item: Any`
     *
     * Invoked when the user selects an item from the dropdown menu.
     */
    onSelect: React.PropTypes.func,
    /**
     * Arguments: `item: Any, value: String`
     *
     * Invoked for each entry in `items` and its return value is used to
     * determine whether or not it should be displayed in the dropdown menu.
     * By default all items are always rendered.
     */
    shouldItemRender: React.PropTypes.func,
    /**
     * Arguments: `itemA: Any, itemB: Any, value: String`
     *
     * The function which is used to sort `items` before display.
     */
    sortItems: React.PropTypes.func,
    /**
     * Arguments: `item: Any`
     *
     * Used to read the display value from each entry in `items`.
     */
    getItemValue: React.PropTypes.func.isRequired,
    /**
     * Arguments: `item: Any, isHighlighted: Boolean, styles: Object`
     *
     * Invoked for each entry in `items` that also passes `shouldItemRender` to
     * generate the render tree for each item in the dropdown menu. `styles` is
     * an optional set of styles that can be applied to improve the look/feel
     * of the items in the dropdown menu.
     */
    renderItem: React.PropTypes.func.isRequired,
    /**
     * Arguments: `items: Array<Any>, value: String, styles: Object`
     *
     * Invoked to generate the render tree for the dropdown menu. Ensure the
     * returned tree includes `items` or else no items will be rendered.
     * `styles` will contain { top, left, minWidth } which are the coordinates
     * of the top-left corner and the width of the dropdown menu.
     */
    renderMenu: React.PropTypes.func,
    /**
     * Styles that are applied to the dropdown menu in the default `renderMenu`
     * implementation. If you override `renderMenu` and you want to use
     * `menuStyles` you must manually apply them (`this.props.menuStyles`).
     */
    menuStyle: React.PropTypes.object,
    /**
     * Props that are applied to the `<input />` element rendered by
     * `Autocomplete`. Any properties supported by `HTMLInputElement` can be
     * specified, apart from the following which are set by `Autocomplete`:
     * value, autoComplete, role, aria-autocomplete
     */
    inputProps: React.PropTypes.object,
    /**
     * Props that are applied to the element which wraps the `<input />` and
     * dropdown menu elements rendered by `Autocomplete`.
     */
    wrapperProps: React.PropTypes.object,
    /**
     * This is a shorthand for `wrapperProps={{ style: <your styles> }}`.
     * Note that `wrapperStyle` is applied before `wrapperProps`, so the latter
     * will win if it contains a `style` entry.
     */
    wrapperStyle: React.PropTypes.object,
    /**
     * Whether or not to automatically highlight the top match in the dropdown
     * menu.
     */
    autoHighlight: React.PropTypes.bool,
    /**
     * Arguments: `isOpen: Boolean`
     *
     * Invoked every time the dropdown menu's visibility changes (i.e. every
     * time it is displayed/hidden).
     */
    onMenuVisibilityChange: React.PropTypes.func,
    /**
     * Used to override the internal logic which displays/hides the dropdown
     * menu. This is useful if you want to force a certain state based on your
     * UX/business logic. Use it together with `onMenuVisibilityChange` for
     * fine-grained control over the dropdown menu dynamics.
     */
    open: React.PropTypes.bool,
    debug: React.PropTypes.bool
  },

  getDefaultProps: function getDefaultProps() {
    return {
      value: '',
      wrapperProps: {},
      wrapperStyle: {
        display: 'inline-block'
      },
      inputProps: {},
      onChange: function onChange() {},
      onSelect: function onSelect() {},
      renderMenu: function renderMenu(items, value, style) {
        return React.createElement('div', { style: _extends({}, style, this.menuStyle), children: items });
      },

      menuStyle: {
        borderRadius: '3px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '2px 0',
        fontSize: '90%',
        position: 'fixed',
        overflow: 'auto',
        maxHeight: '50%' },
      autoHighlight: true,
      onMenuVisibilityChange: function onMenuVisibilityChange() {}
    };
  },
  getInitialState: function getInitialState() {
    return {
      isOpen: false,
      highlightedIndex: null
    };
  },
  componentWillMount: function componentWillMount() {
    this._ignoreBlur = false;
    this._performAutoCompleteOnUpdate = false;
    this._performAutoCompleteOnKeyUp = false;
  },
  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    this._performAutoCompleteOnUpdate = true;
    // If `items` has changed we want to reset `highlightedIndex`
    // since it probably no longer refers to a relevant item
    if (this.props.items !== nextProps.items ||
    // The entries in `items` may have been changed even though the
    // object reference remains the same, double check by seeing
    // if `highlightedIndex` points to an existing item
    this.state.highlightedIndex >= nextProps.items.length) {
      this.setState({ highlightedIndex: null });
    }
  },
  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
    if (this.state.isOpen === true && prevState.isOpen === false) this.setMenuPositions();

    if (this.state.isOpen && this._performAutoCompleteOnUpdate) {
      this._performAutoCompleteOnUpdate = false;
      this.maybeAutoCompleteText();
    }

    this.maybeScrollItemIntoView();
    if (prevState.isOpen !== this.state.isOpen) {
      this.props.onMenuVisibilityChange(this.state.isOpen);
    }
  },
  maybeScrollItemIntoView: function maybeScrollItemIntoView() {
    if (this.state.isOpen === true && this.state.highlightedIndex !== null) {
      var itemNode = this.refs['item-' + this.state.highlightedIndex];
      var menuNode = this.refs.menu;
      scrollIntoView(findDOMNode(itemNode), findDOMNode(menuNode), { onlyScrollIfNeeded: true });
    }
  },
  handleKeyDown: function handleKeyDown(event) {
    if (this.keyDownHandlers[event.key]) this.keyDownHandlers[event.key].call(this, event);else {
      this.setState({
        highlightedIndex: null,
        isOpen: true
      });
    }
  },
  handleChange: function handleChange(event) {
    this._performAutoCompleteOnKeyUp = true;
    this.props.onChange(event, event.target.value);
  },
  handleKeyUp: function handleKeyUp() {
    if (this._performAutoCompleteOnKeyUp) {
      this._performAutoCompleteOnKeyUp = false;
      this.maybeAutoCompleteText();
    }
  },


  keyDownHandlers: {
    ArrowDown: function ArrowDown(event) {
      event.preventDefault();
      var itemsLength = this.getFilteredItems().length;
      if (!itemsLength) return;
      var highlightedIndex = this.state.highlightedIndex;

      var index = highlightedIndex === null || highlightedIndex === itemsLength - 1 ? 0 : highlightedIndex + 1;
      this._performAutoCompleteOnKeyUp = true;
      this.setState({
        highlightedIndex: index,
        isOpen: true
      });
    },
    ArrowUp: function ArrowUp(event) {
      event.preventDefault();
      var itemsLength = this.getFilteredItems().length;
      if (!itemsLength) return;
      var highlightedIndex = this.state.highlightedIndex;

      var index = highlightedIndex === 0 || highlightedIndex === null ? itemsLength - 1 : highlightedIndex - 1;
      this._performAutoCompleteOnKeyUp = true;
      this.setState({
        highlightedIndex: index,
        isOpen: true
      });
    },
    Enter: function Enter(event) {
      var _this = this;

      if (this.state.isOpen === false) {
        // menu is closed so there is no selection to accept -> do nothing
        return;
      } else if (this.state.highlightedIndex == null) {
        // input has focus but no menu item is selected + enter is hit -> close the menu, highlight whatever's in input
        this.setState({
          isOpen: false
        }, function () {
          _this.refs.input.select();
        });
      } else {
        // text entered + menu item has been highlighted + enter is hit -> update value to that of selected menu item, close the menu
        event.preventDefault();
        var item = this.getFilteredItems()[this.state.highlightedIndex];
        var value = this.props.getItemValue(item);
        this.setState({
          isOpen: false,
          highlightedIndex: null
        }, function () {
          //this.refs.input.focus() // TODO: file issue
          _this.refs.input.setSelectionRange(value.length, value.length);
          _this.props.onSelect(value, item);
        });
      }
    },
    Escape: function Escape(event) {
      this.setState({
        highlightedIndex: null,
        isOpen: false
      });
    }
  },

  getFilteredItems: function getFilteredItems() {
    var _this2 = this;

    var items = this.props.items;

    if (this.props.shouldItemRender) {
      items = items.filter(function (item) {
        return _this2.props.shouldItemRender(item, _this2.props.value);
      });
    }

    if (this.props.sortItems) {
      items.sort(function (a, b) {
        return _this2.props.sortItems(a, b, _this2.props.value);
      });
    }

    return items;
  },
  maybeAutoCompleteText: function maybeAutoCompleteText() {
    if (!this.props.autoHighlight || this.props.value === '') return;
    var highlightedIndex = this.state.highlightedIndex;

    var items = this.getFilteredItems();
    if (items.length === 0) return;
    var matchedItem = highlightedIndex !== null ? items[highlightedIndex] : items[0];
    var itemValue = this.props.getItemValue(matchedItem);
    var itemValueDoesMatch = itemValue.toLowerCase().indexOf(this.props.value.toLowerCase()) === 0;
    if (itemValueDoesMatch && highlightedIndex === null) this.setState({ highlightedIndex: 0 });
  },
  setMenuPositions: function setMenuPositions() {
    var node = this.refs.input;
    var rect = node.getBoundingClientRect();
    var computedStyle = global.window.getComputedStyle(node);
    var marginBottom = parseInt(computedStyle.marginBottom, 10) || 0;
    var marginLeft = parseInt(computedStyle.marginLeft, 10) || 0;
    var marginRight = parseInt(computedStyle.marginRight, 10) || 0;
    this.setState({
      menuTop: rect.bottom + marginBottom,
      menuLeft: rect.left + marginLeft,
      menuWidth: rect.width + marginLeft + marginRight
    });
  },
  highlightItemFromMouse: function highlightItemFromMouse(index) {
    this.setState({ highlightedIndex: index });
  },
  selectItemFromMouse: function selectItemFromMouse(item) {
    var _this3 = this;

    var value = this.props.getItemValue(item);
    this.setState({
      isOpen: false,
      highlightedIndex: null
    }, function () {
      _this3.props.onSelect(value, item);
      _this3.refs.input.focus();
    });
  },
  setIgnoreBlur: function setIgnoreBlur(ignore) {
    this._ignoreBlur = ignore;
  },
  renderMenu: function renderMenu() {
    var _this4 = this;

    var items = this.getFilteredItems().map(function (item, index) {
      var element = _this4.props.renderItem(item, _this4.state.highlightedIndex === index, { cursor: 'default' });
      return React.cloneElement(element, {
        onMouseDown: function onMouseDown() {
          return _this4.setIgnoreBlur(true);
        }, // Ignore blur to prevent menu from de-rendering before we can process click
        onMouseEnter: function onMouseEnter() {
          return _this4.highlightItemFromMouse(index);
        },
        onClick: function onClick() {
          return _this4.selectItemFromMouse(item);
        },
        ref: 'item-' + index
      });
    });
    var style = {
      left: this.state.menuLeft,
      top: this.state.menuTop,
      minWidth: this.state.menuWidth
    };
    var menu = this.props.renderMenu(items, this.props.value, style);
    return React.cloneElement(menu, {
      ref: 'menu',
      onMouseEnter: function onMouseEnter() {
        return _this4.setIgnoreBlur(true);
      },
      onMouseLeave: function onMouseLeave() {
        return _this4.setIgnoreBlur(false);
      }
    });
  },
  handleInputBlur: function handleInputBlur() {
    if (this._ignoreBlur) return;
    this.setState({
      isOpen: false,
      highlightedIndex: null
    });
  },
  handleInputFocus: function handleInputFocus() {
    if (this._ignoreBlur) {
      this.setIgnoreBlur(false);
      return;
    }
    // We don't want `selectItemFromMouse` to trigger when
    // the user clicks into the input to focus it, so set this
    // flag to cancel out the logic in `handleInputClick`.
    // The event order is:  MouseDown -> Focus -> MouseUp -> Click
    this._ignoreClick = true;
    this.setState({ isOpen: true });
  },
  isInputFocused: function isInputFocused() {
    var el = this.refs.input;
    return el.ownerDocument && el === el.ownerDocument.activeElement;
  },
  handleInputClick: function handleInputClick() {
    // Input will not be focused if it's disabled
    if (this.isInputFocused() && this.state.isOpen === false) this.setState({ isOpen: true });else if (this.state.highlightedIndex !== null && !this._ignoreClick) this.selectItemFromMouse(this.getFilteredItems()[this.state.highlightedIndex]);
    this._ignoreClick = false;
  },
  composeEventHandlers: function composeEventHandlers(internal, external) {
    return external ? function (e) {
      internal(e);external(e);
    } : internal;
  },
  render: function render() {
    if (this.props.debug) {
      // you don't like it, you love it
      _debugStates.push({
        id: _debugStates.length,
        state: this.state
      });
    }

    var inputProps = this.props.inputProps;

    return React.createElement(
      'div',
      _extends({ style: _extends({}, this.props.wrapperStyle) }, this.props.wrapperProps),
      React.createElement('input', _extends({}, inputProps, {
        role: 'combobox',
        'aria-autocomplete': 'list',
        autoComplete: 'off',
        ref: 'input',
        onFocus: this.composeEventHandlers(this.handleInputFocus, inputProps.onFocus),
        onBlur: this.composeEventHandlers(this.handleInputBlur, inputProps.onBlur),
        onChange: this.handleChange,
        onKeyDown: this.composeEventHandlers(this.handleKeyDown, inputProps.onKeyDown),
        onKeyUp: this.composeEventHandlers(this.handleKeyUp, inputProps.onKeyUp),
        onClick: this.composeEventHandlers(this.handleInputClick, inputProps.onClick),
        value: this.props.value
      })),
      ('open' in this.props ? this.props.open : this.state.isOpen) && this.renderMenu(),
      this.props.debug && React.createElement(
        'pre',
        { style: { marginLeft: 300 } },
        JSON.stringify(_debugStates.slice(_debugStates.length - 5, _debugStates.length), null, 2)
      )
    );
  }
});

module.exports = Autocomplete;