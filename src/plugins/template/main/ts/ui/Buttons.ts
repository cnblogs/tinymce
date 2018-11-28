/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import Templates from '../core/Templates';
import Dialog from './Dialog';

const showDialog = function (editor) {
  return function (templates) {
    Dialog.open(editor, templates);
  };
};

const register = function (editor) {
  editor.ui.registry.addButton('template', {
    icon: 'template',
    tooltip: 'Insert template',
    onAction: Templates.createTemplateList(editor.settings, showDialog(editor))
  });

  editor.ui.registry.addMenuItem('template', {
    icon: 'template',
    text: 'Insert template...',
    onAction: Templates.createTemplateList(editor.settings, showDialog(editor)),
  });
};

export default {
  register
};