import { AddEventsBehaviour, AlloyComponent, AlloyEvents, Behaviour, Button, Focusing, Input, Keying, NativeEvents, Representing, SketchSpec } from '@ephox/alloy';
import { Cell, Fun, Id, Optional } from '@ephox/katamari';
import { Focus, SugarElement, Traverse } from '@ephox/sugar';

import Editor from 'tinymce/core/api/Editor';
import { UiFactoryBackstage } from 'tinymce/themes/silver/backstage/Backstage';

import { onControlAttached, onControlDetached } from '../../controls/Controls';
import { updateMenuText, UpdateMenuTextEvent } from '../../dropdown/CommonDropdown';
import { onSetupEvent } from '../ControlUtils';
import { NumberInputSpec } from './FontSizeBespoke';

interface BespokeSelectApi {
  readonly getComponent: () => AlloyComponent;
}

const createBespokeNumberInput = (editor: Editor, _backstage: UiFactoryBackstage, spec: NumberInputSpec): SketchSpec => {
  const currentComp: Cell<Optional<AlloyComponent>> = Cell(Optional.none());

  const getValueFromCurrentComp = (comp: Cell<Optional<AlloyComponent>>): string => comp
    .get().map((alloyComp) => Representing.getValue(alloyComp)).getOr('');

  const onSetup = onSetupEvent(editor, 'NodeChange', (api: BespokeSelectApi) => {
    const comp = api.getComponent();
    currentComp.set(Optional.some(comp));
    spec.updateText(comp);
  });

  const getApi = (comp: AlloyComponent): BespokeSelectApi => ({ getComponent: Fun.constant(comp) });
  const editorOffCell = Cell(Fun.noop);

  const customEvents = Id.generate('custom-number-input-events');

  const isValidValue = (value: number): boolean => value >= 0;

  const changeValue = (f: (v: number, step: number) => number): void => {
    const text = getValueFromCurrentComp(currentComp);
    const value = parseFloat(text.match(/^[\d\.]+/)?.join('') ?? '0');
    const unitRegexp = new RegExp(`(?<=${value})\\D+$`);
    const unit = text.match(unitRegexp)?.join('') ?? '';
    const newValue = f(value, spec.getConfigFromUnit(unit).step);
    const newValueWithUnit = `${isValidValue(newValue) ? newValue : value}${unit}`;

    spec.onAction(newValueWithUnit);
    currentComp.get().each((comp) => Representing.setValue(comp, newValueWithUnit));
  };

  const decrease = () => changeValue((n, s) => n - s);
  const increase = () => changeValue((n, s) => n + s);

  const buttonStyles = {
    'width': '20px',
    'text-align': 'center',
    'background-color': 'grey'
  };

  return {
    uid: Id.generate('number-input-wrapper'),
    dom: {
      tag: 'div',
      styles: {
        display: 'flex'
      },
      classes: [ 'tox-number-input' ]
    },
    components: [
      Button.sketch({
        dom: {
          tag: 'button',
          styles: buttonStyles,
          innerHtml: '-',
          classes: [ 'minus' ]
        },
        action: decrease
      }),
      Input.sketch({
        inputStyles: {
          'width': '75px',
          'text-align': 'center'
        },
        inputBehaviours: Behaviour.derive([
          AddEventsBehaviour.config(customEvents, [
            onControlAttached({ onSetup, getApi }, editorOffCell),
            onControlDetached({ getApi }, editorOffCell)
          ]),
          AddEventsBehaviour.config('menubutton-update-display-text', [
            AlloyEvents.run<UpdateMenuTextEvent>(updateMenuText, (comp, se) => {
              Representing.setValue(comp, se.event.text);
            }),
            AlloyEvents.run(NativeEvents.focusout(), (_comp, se) => {
              spec.onAction(se.event.target.dom.value);
            }),
            AlloyEvents.run(NativeEvents.change(), (_comp, se) => {
              spec.onAction(se.event.target.dom.value);
            })
          ]),
          Keying.config({
            mode: 'special',
            onEnter: (comp) => {
              comp.element.dom.blur();
              return Optional.some(true);
            },
            onUp: (comp) => {
              increase();
              // TOFIX: now it preserve the focus but it put the selection at the end of the input
              Focus.focusInside(comp.element);
              return Optional.some(true);
            },
            onDown: (comp) => {
              decrease();
              Focus.focusInside(comp.element);
              return Optional.some(true);
            }
          })
        ])
      }),
      Button.sketch({
        dom: {
          tag: 'button',
          styles: buttonStyles,
          innerHtml: '+',
          classes: [ 'plus' ]
        },
        action: increase
      })
    ],
    behaviours: Behaviour.derive([
      Focusing.config({}),
      Keying.config({
        mode: 'special',
        onEnter: (comp) => {
          if (Focus.hasFocus(comp.element)) {
            Traverse.child(comp.element, 1).each((inputElement) => {
              Focus.focus(inputElement as SugarElement<HTMLElement>);
            });
            return Optional.some(true);
          } else {
            return Optional.none();
          }
        },
        onEscape: (wrapperComp) => {
          if (Focus.hasFocus(wrapperComp.element)) {
            return Optional.none();
          } else {
            Focus.focus(wrapperComp.element);
            return Optional.some(true);
          }
        }
      })
    ])
  };
};

export { createBespokeNumberInput };
