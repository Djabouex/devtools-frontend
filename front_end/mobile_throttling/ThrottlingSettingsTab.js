// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.ListWidget.Delegate<!SDK.NetworkManager.Conditions>}
 * @unrestricted
 */
export class ThrottlingSettingsTab extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('mobile_throttling/throttlingSettingsTab.css', {enableLegacyPatching: true});

    const header = this.contentElement.createChild('div', 'header');
    header.textContent = ls`Network Throttling Profiles`;
    UI.ARIAUtils.markAsHeading(header, 1);

    const addButton = UI.UIUtils.createTextButton(
        Common.UIString.UIString('Add custom profile...'), this._addButtonClicked.bind(this), 'add-conditions-button');
    this.contentElement.appendChild(addButton);

    this._list = new UI.ListWidget.ListWidget(this);
    this._list.element.classList.add('conditions-list');
    this._list.registerRequiredCSS('mobile_throttling/throttlingSettingsTab.css', {enableLegacyPatching: true});
    this._list.show(this.contentElement);

    this._customSetting = Common.Settings.Settings.instance().moduleSetting('customNetworkConditions');
    this._customSetting.addChangeListener(this._conditionsUpdated, this);

    this.setDefaultFocusedElement(addButton);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._conditionsUpdated();
  }

  _conditionsUpdated() {
    this._list.clear();

    const conditions = this._customSetting.get();
    for (let i = 0; i < conditions.length; ++i) {
      this._list.appendItem(conditions[i], true);
    }

    this._list.appendSeparator();
  }

  _addButtonClicked() {
    this._list.addNewItem(this._customSetting.get().length, {title: '', download: -1, upload: -1, latency: 0});
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(conditions, editable) {
    const element = document.createElement('div');
    element.classList.add('conditions-list-item');
    const title = element.createChild('div', 'conditions-list-text conditions-list-title');
    const titleText = title.createChild('div', 'conditions-list-title-text');
    titleText.textContent = conditions.title;
    UI.Tooltip.Tooltip.install(titleText, conditions.title);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.download);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent = throughputText(conditions.upload);
    element.createChild('div', 'conditions-list-separator');
    element.createChild('div', 'conditions-list-text').textContent =
        Common.UIString.UIString('%dms', conditions.latency);
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    const list = this._customSetting.get();
    list.splice(index, 1);
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @param {!UI.ListWidget.Editor<!SDK.NetworkManager.Conditions>} editor
   * @param {boolean} isNew
   */
  commitEdit(conditions, editor, isNew) {
    conditions.title = editor.control('title').value.trim();
    const download = editor.control('download').value.trim();
    conditions.download = download ? parseInt(download, 10) * (1000 / 8) : -1;
    const upload = editor.control('upload').value.trim();
    conditions.upload = upload ? parseInt(upload, 10) * (1000 / 8) : -1;
    const latency = editor.control('latency').value.trim();
    conditions.latency = latency ? parseInt(latency, 10) : 0;

    const list = this._customSetting.get();
    if (isNew) {
      list.push(conditions);
    }
    this._customSetting.set(list);
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @return {!UI.ListWidget.Editor<!SDK.NetworkManager.Conditions>}
   */
  beginEdit(conditions) {
    const editor = this._createEditor();
    editor.control('title').value = conditions.title;
    editor.control('download').value = conditions.download <= 0 ? '' : String(conditions.download / (1000 / 8));
    editor.control('upload').value = conditions.upload <= 0 ? '' : String(conditions.upload / (1000 / 8));
    editor.control('latency').value = conditions.latency ? String(conditions.latency) : '';
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor<!SDK.NetworkManager.Conditions>}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    this._editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'conditions-edit-row');
    const nameLabel = titles.createChild('div', 'conditions-list-text conditions-list-title');
    const nameStr = ls`Profile Name`;
    nameLabel.textContent = nameStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const downloadLabel = titles.createChild('div', 'conditions-list-text');
    const downloadStr = ls`Download`;
    downloadLabel.textContent = downloadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const uploadLabel = titles.createChild('div', 'conditions-list-text');
    const uploadStr = ls`Upload`;
    uploadLabel.textContent = uploadStr;
    titles.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');
    const latencyLabel = titles.createChild('div', 'conditions-list-text');
    const latencyStr = ls`Latency`;
    latencyLabel.textContent = latencyStr;

    const fields = content.createChild('div', 'conditions-edit-row');
    const nameInput = editor.createInput('title', 'text', '', titleValidator);
    UI.ARIAUtils.setAccessibleName(nameInput, nameStr);
    fields.createChild('div', 'conditions-list-text conditions-list-title').appendChild(nameInput);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    let cell = fields.createChild('div', 'conditions-list-text');
    const downloadInput = editor.createInput('download', 'text', ls`kb/s`, throughputValidator);
    cell.appendChild(downloadInput);
    UI.ARIAUtils.setAccessibleName(downloadInput, downloadStr);
    const downloadOptional = cell.createChild('div', 'conditions-edit-optional');
    const optionalStr = ls`optional`;
    downloadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(downloadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const uploadInput = editor.createInput('upload', 'text', ls`kb/s`, throughputValidator);
    UI.ARIAUtils.setAccessibleName(uploadInput, uploadStr);
    cell.appendChild(uploadInput);
    const uploadOptional = cell.createChild('div', 'conditions-edit-optional');
    uploadOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(uploadInput, optionalStr);
    fields.createChild('div', 'conditions-list-separator conditions-list-separator-invisible');

    cell = fields.createChild('div', 'conditions-list-text');
    const latencyInput = editor.createInput('latency', 'text', ls`ms`, latencyValidator);
    UI.ARIAUtils.setAccessibleName(latencyInput, latencyStr);
    cell.appendChild(latencyInput);
    const latencyOptional = cell.createChild('div', 'conditions-edit-optional');
    latencyOptional.textContent = optionalStr;
    UI.ARIAUtils.setDescription(latencyInput, optionalStr);

    return editor;

    /**
     * @param {!SDK.NetworkManager.Conditions} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function titleValidator(item, index, input) {
      const maxLength = 49;
      const value = input.value.trim();
      const valid = value.length > 0 && value.length <= maxLength;
      if (!valid) {
        const errorMessage = ls`Profile Name characters length must be between 1 to ${maxLength} inclusive`;
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    /**
     * @param {!SDK.NetworkManager.Conditions} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function throughputValidator(item, index, input) {
      const minThroughput = 0;
      const maxThroughput = 10000000;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const throughput = input.getAttribute('aria-label');
      const valid = !Number.isNaN(parsedValue) && parsedValue >= minThroughput && parsedValue <= maxThroughput;
      if (!valid) {
        const errorMessage =
            ls`${throughput} must be a number between ${minThroughput}kb/s to ${maxThroughput}kb/s inclusive`;
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }

    /**
     * @param {!SDK.NetworkManager.Conditions} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function latencyValidator(item, index, input) {
      const minLatency = 0;
      const maxLatency = 1000000;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = Number.isInteger(parsedValue) && parsedValue >= minLatency && parsedValue <= maxLatency;
      if (!valid) {
        const errorMessage = ls`Latency must be an integer between ${minLatency}ms to ${maxLatency}ms inclusive`;
        return {valid, errorMessage};
      }
      return {valid, errorMessage: undefined};
    }
  }
}

/**
 * @param {number} throughput
 * @param {boolean=} plainText
 * @return {string}
 */
export function throughputText(throughput, plainText) {
  if (throughput < 0) {
    return '';
  }
  const throughputInKbps = throughput / (1000 / 8);
  const delimiter = plainText ? '' : ' ';
  if (throughputInKbps < 1000) {
    return Common.UIString.UIString('%d%skB/s', throughputInKbps, delimiter);
  }
  if (throughputInKbps < 1000 * 10) {
    return Common.UIString.UIString('%.1f%sMB/s', throughputInKbps / 1000, delimiter);
  }
  return Common.UIString.UIString('%d%sMB/s', (throughputInKbps / 1000) | 0, delimiter);
}
