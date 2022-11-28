import { ApproxStructure, Assertions, Waiter } from '@ephox/agar';
import { beforeEach, context, describe, it } from '@ephox/bedrock-client';
import { Arr, Fun, Optional } from '@ephox/katamari';
import { Class, Css, Html, Insert, InsertAll, Remove, SelectorFind, SugarBody, SugarElement, Traverse } from '@ephox/sugar';
import { TinyDom, TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'tinymce/core/api/Editor';

interface TestUi {
  readonly className: string;
  readonly selector: string;
}

interface TestScenario {
  readonly label: string;
  readonly settings: {
    readonly inline: boolean;
    readonly shadow: boolean;
  };
}

enum TriggerWaitDecision {
  FailWithError,
  KeepWaiting,
  Succeed
}

describe('browser.tinymce.themes.silver.editor.scrolling.EditorInScrollingContainerTest', () => {
  const sharedSettings = {
    menubar: 'file',
    toolbar: 'undo bold opendialog',
    base_url: '/project/tinymce/js/tinymce'
  };

  const fromClass = (className: string): TestUi => ({
    className,
    selector: `.${className}`
  });

  const ui = {
    external: {
      // It is an editor component, but it's not a child of the editor container
      inlineHeader: fromClass('tox-tinymce-inline'),
    },
    ancestors: {
      scrollingWrapper: fromClass('scrolling-wrapper'),
      outerScroller: fromClass('outer-scroller'),
    },
    editor: {
      stickyHeader: fromClass('tox-editor-header'),

      stickyHeaderVisible: fromClass('tox-editor-dock-fadein'),
      stickyHeaderInvisible: fromClass('tox-editor-dock-fadeout'),
      stickyHeaderTransitioning: fromClass('tox-editor-dock-transition'),
      menuButton: fromClass('tox-mbtn'),
      menu: {
        className: 'tox-menu',
        selector: '[role=menu]'
      },
      menubar: {
        className: 'tox-menubar',
        selector: '[role=menubar]'
      }
    }

  };

  const heights = {
    banner: 300,
    scroller: 500,
    outerScroller: 200,
    editor: 2000,
    miniEditor: 400
  };

  const getAncestorUi = (editor: Editor, testUi: TestUi) => {
    return SelectorFind.ancestor<HTMLElement>(TinyDom.container(editor), testUi.selector)
      .fold(
        () => {
          debugger;
          throw new Error(`Could not find selector: ${testUi.selector}`);
        },
        // eslint-disable-next-line @tinymce/prefer-fun
        (ui) => ui
      );
  };

  const getExternalUi = (editor: Editor, testUi: TestUi) => {
    const root = TinyUiActions.getUiRoot(editor);
    return SelectorFind.descendant<HTMLElement>(root, testUi.selector)
      .fold(
        () => {
          debugger;
          throw new Error(`Could not find selector: ${testUi.selector} in root`);
        },

        // eslint-disable-next-line @tinymce/prefer-fun
        (ui) => ui
      );
  };

  const getEditorUi = (editor: Editor, testUi: TestUi) => {
    return SelectorFind.descendant<HTMLElement>(TinyDom.container(editor), testUi.selector).getOrDie(
      `Could not find selector: ${testUi.selector}`
    );
  };

  const resetScrolls = (editor: Editor) => {
    const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);
    scroller.dom.scrollTo(0, 0);

    window.scrollTo(0, 0);
    editor.getWin().scrollTo(0, 0);
  };

  const assertApprox = (label: string, value1: number, value2: number, marginOfError: number): void => {
    assert.isTrue(
      Math.abs(value1 - value2) <= marginOfError,
      `${label}.
        Value1: ${value1}\n
        Value2: ${value2}\n
        Error Margin: ${marginOfError}`
    );
  };

  const pWaitUntilUndocked = (header: SugarElement<HTMLElement>): Promise<void> => Waiter.pTryUntil(
    'Waiting for sticky element to undock',
    () => {
      Assertions.assertStructure(
        'Element should undock',
        ApproxStructure.build((s, str, _arr) => s.element('div', {
          styles: {
            position: str.none()
          }
        })),
        header
      );
    }
  );

  const pWaitUntilUndockedAbsolute = (header: SugarElement<HTMLElement>): Promise<void> => Waiter.pTryUntil(
    'Waiting for sticky element to undock',
    () => {
      Assertions.assertStructure(
        'Element should undock',
        ApproxStructure.build((s, str, _arr) => s.element('div', {
          styles: {
            position: str.is('absolute')
          }
        })),
        header
      );
    }
  );

  const pWaitUntilUndockedFor = (scenario: TestScenario, editor: Editor): Promise<void> => {
    if (scenario.settings.inline && false) {
      // Get the inline container, which is different from the stickyHeader
      const inlineHeader = getExternalUi(editor, ui.external.inlineHeader);
      return pWaitUntilUndocked(inlineHeader);
    } else {
      const stickyHeader = getEditorUi(editor, ui.editor.stickyHeader);
      return pWaitUntilUndocked(stickyHeader);
    }
  };

  const pWaitUntilDockedAtTop = (header: SugarElement<HTMLElement>, optTop: Optional<number>): Promise<void> => Waiter.pTryUntil(
    'Waiting for sticky element to dock',
    () => {
      Assertions.assertStructure(
        'Element should dock to the top',
        ApproxStructure.build((s, str, _arr) => s.element('div', {
          styles: {
            position: str.is('fixed'),
            ...(optTop.map((top) => ({
              // Allow 5px of error.
              top: str.measurement(top, 'px', 5)
            })).getOr({ }))
          }
        })),
        header
      );
    }
  );

  const pWaitUntilDockedAtTopFor = (scenario: TestScenario, editor: Editor, optTop: Optional<number>): Promise<void> => {
    // HERE. // fixed is put on the *inside* thing. Groan. So change this.
    if (scenario.settings.inline && false) {
      const inlineHeader = getExternalUi(editor, ui.external.inlineHeader);
      return pWaitUntilDockedAtTop(inlineHeader, optTop);
    } else {
      const stickyHeader = getEditorUi(editor, ui.editor.stickyHeader);
      return pWaitUntilDockedAtTop(stickyHeader, optTop);
    }
  };

  const pWaitUntilAppears = (header: SugarElement<HTMLElement>): Promise<void> => Waiter.pTryUntil(
    'Waiting for sticky toolbar to appear',
    () => {
      Assertions.assertStructure(
        'Sticky toolbar should appear',
        ApproxStructure.build((s, str, arr) => s.element('div', {
          classes: [
            // The first time it appears, it doesn't get fade-in, so we just look for non-fadeout
            // for now.
            arr.not(ui.editor.stickyHeaderInvisible.className),
            // TINY-9408: In classic mode, the transition class isn't going away because
            // there is another transition style clobbering it. Reinstate the `arr.not` check
            // when the bug is fixed.
            // arr.not(ui.editor.stickyHeaderTransitioning.className)
          ]
        })),
        header
      );
    }
  );

  const pWaitUntilDisappears = (header: SugarElement<HTMLElement>): Promise<void> => Waiter.pTryUntil(
    'Waiting for sticky toolbar to disappear',
    () => {
      Assertions.assertStructure(
        'Sticky toolbar should disappear',
        ApproxStructure.build((s, str, arr) => s.element('div', {
          classes: [
            arr.has(ui.editor.stickyHeaderInvisible.className),
            // TINY-9408: In classic mode, the transition class isn't going away because
            // there is another transition style clobbering it. Reinstate the `arr.not` check
            // when the bug is fixed.
            // arr.not(ui.editor.stickyHeaderTransitioning.className)
          ]
        })),
        header
      );
    }
  );

  const pWaitUntilTriggersEvent = (
    editor: Editor,
    eventName: string,
    validate: (evt: any) => TriggerWaitDecision,
    action: () => void
  ): Promise<void> => {

    let hasFinished = false;
    let errorMessage: string | null = null;

    const f = (evt: Event) => {
      const v = validate(evt);
      if (v === TriggerWaitDecision.Succeed) {
        editor.off(eventName, f);
        hasFinished = true;
      } else if (v === TriggerWaitDecision.FailWithError) {
        editor.off(eventName, f);
        hasFinished = false;
        errorMessage = `Error while waiting for ${eventName} event`;
      } else {
        // Keep waiting.
      }
    };

    editor.on(eventName, f);
    console.log('Waiting', eventName, Date.now());
    action();

    return Waiter.pTryUntil(
      `Waiting until event ${eventName} is triggered by action`,
      () => {
        if (errorMessage !== null) {
          const m = errorMessage;
          errorMessage = null;
          throw new Error('errormessage');
          throw new Error(m);
        } else if (hasFinished) {
          console.log('Heard event', eventName, Date.now());
          return;
        } else {
          console.log('keep waiting');
          throw new Error('Keep waiting');
        }
      }
    ).then<void>((res) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
    });
  };

  const pRunMenuDisconnectTestWithAdjustment = async (editor: Editor, adjustScrollPosition: () => Promise<void>): Promise<void> => {
    const header = getEditorUi(editor, ui.editor.stickyHeader);
    // It should not be fixed yet.
    assert.isTrue(Css.getRaw(header, 'position').isNone(), 'We have not yet docked the sticky toolbar');

    // Open the menu
    TinyUiActions.clickOnMenu(editor, `${ui.editor.menuButton.selector}:contains("File")`);

    const menu = await TinyUiActions.pWaitForPopup(editor, ui.editor.menu.selector);

    const menubar = await TinyUiActions.pWaitForUi(editor, ui.editor.menubar.selector);

    const assertMenuBelowMenubar = () => {
      // This is the allowed gap between the bottom of the menubar and the top of the menu
      const allowedGap = 10;
      const menubarBottom = menubar.dom.getBoundingClientRect().bottom;
      const menuTop = menu.dom.getBoundingClientRect().top;
      assertApprox(
        'Menu and menubar should stay in sync',
        menubarBottom,
        menuTop,
        allowedGap
      );
    };

    assertMenuBelowMenubar();

    adjustScrollPosition();
    await Waiter.pTryUntil(
      'Waiting until the menu is positioned under the menubar',
      () => assertMenuBelowMenubar()
    );

    // Close the menu
    TinyUiActions.clickOnMenu(editor, `${ui.editor.menuButton.selector}:contains("File")`);
  };

  const setupTargetElement = (scenario: TestScenario): SugarElement<HTMLElement> => {
    // Can't be a textarea for inline mode.
    if (scenario.settings.inline) {
      const target = SugarElement.fromTag('div');
      Css.set(target, 'height', '2000px');
      // When the editor is inline, we give it some content to give it height.
      const paragraphs = Arr.range(
        18,
        (x) => `<p>This is paragraph #${x + 1}`
      ).join('\n');
      Html.set(target, paragraphs);
      return target;
    } else {
      const target = SugarElement.fromTag('textarea');
      return target;
    }
  };

  const setupSingleScrollerElement = (scenario: TestScenario) => {
    const scroller = SugarElement.fromTag('div');
    Css.setAll(scroller, {
      overflow: 'auto',
      height: `${heights.scroller}px`,
      margin: '0em 2em 2000px 2em',
      outline: '3px solid brown'
    });
    Class.add(scroller, ui.ancestors.scrollingWrapper.className);

    const mkBanner = (height: number, bgColor: string) => SugarElement.fromHtml(
      `<div style="height: ${height}px; background-color: ${bgColor};" />`
    );

    // Can't be a textarea for inline mode.
    const target = setupTargetElement(scenario);

    InsertAll.append(
      scroller,
      [
        mkBanner(heights.banner, 'orange'),
        target,
        mkBanner(2000, 'lime')
      ]
    );

    Insert.append(SugarBody.body(), scroller);

    return {
      element: target,
      teardown: () => {
        Remove.remove(scroller);
      }
    };
  };

  const pWaitUntilElementScrollFires = (editor: Editor, scroller: SugarElement<HTMLElement>, x: number, y: number): Promise<void> =>
    pWaitUntilTriggersEvent(
      editor,
      'ElementScroll',
      (evt) => evt.target === scroller.dom ? TriggerWaitDecision.Succeed : TriggerWaitDecision.KeepWaiting,
      () => scroller.dom.scrollTo(x, y)
    );

  const pWaitUntilScrollWindowFires = (editor: Editor, x: number, y: number): Promise<void> =>
    pWaitUntilTriggersEvent(
      editor,
      'ScrollWindow',
      Fun.constant(TriggerWaitDecision.Succeed),
      () => {
        console.log('Checking this');
        window.scrollTo(x, y);
      }
    );

  const scenarios: TestScenario[] = [
    { label: 'classic', settings: { inline: false, shadow: false }},
    { label: 'inline', settings: { inline: true, shadow: false }},
    // { label: 'shadowdom classic', settings: { inline: false, shadow: true }},
    // { label: 'shadowdom inline', settings: { inline: true, shadow: true }}
  ];

  context('Shadow DOM Editor', () => {

  });

  context('Classic editor', () => {
    const scenario = scenarios[1];

    context('Single scroller', () => {
      const hook = TinyHooks.bddSetupFromElement<Editor>(
        {
          ...sharedSettings,
          ui_of_tomorrow: true,
          toolbar_sticky: true,
          height: heights.editor,
          inline: scenario.settings.inline,
        },
        () => setupSingleScrollerElement(scenario),
        [],
        // Inline mode needs focus for the header to appear
        scenario.settings.inline
      );

      beforeEach(() => resetScrolls(hook.editor()));

      context('No disconnect between menubar and menu after scrolling', () => {
        it('When scrolling the outer page', async () => {
          const editor = hook.editor();
          await pRunMenuDisconnectTestWithAdjustment(
            editor,
            () => pWaitUntilScrollWindowFires(editor, 0, 200)
          );
        });

        it('When scrolling the scroller', async () => {
          const editor = hook.editor();
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);
          await pRunMenuDisconnectTestWithAdjustment(
            editor,
            () => pWaitUntilElementScrollFires(
              editor,
              scroller,
              0,
              // Don't scroll so far that it docks.
              heights.banner - 50
            )
          );
        });

        it('When scrolling the editor itself', async () => {
          const editor = hook.editor();
          const paragraphs = Arr.range(100, (x) => `<p>This is line #${x}</p>`).join('\n');
          editor.setContent(paragraphs);
          await pRunMenuDisconnectTestWithAdjustment(
            editor,
            () => {
              editor.getWin().scrollTo(0, 500);
              return Promise.resolve();
            }
          );
        });
      });

      context('Testing stickiness', () => {
        it('When scrolling the outer page', async () => {
          const editor = hook.editor();
          const header = getEditorUi(editor, ui.editor.stickyHeader);
          const headerTop = header.dom.getBoundingClientRect().top;
          console.log('headerTop', headerTop);

          await pWaitUntilScrollWindowFires(
            editor, 0, headerTop - 10
          );

          // It should not be docked yet.
          await pWaitUntilUndockedFor(scenario, editor);

          // Scroll a bit further, and it should dock to top: 0px.
          // An amount of chosen that will trigger docking.
          const scrollPastHeaderAmount = 30;
          await pWaitUntilScrollWindowFires(
            editor,
            0,
            headerTop + scrollPastHeaderAmount
          );
          await pWaitUntilDockedAtTopFor(scenario, editor, Optional.some(0));

          // Scroll back a bit and watch it undock.
          await pWaitUntilScrollWindowFires(
            editor,
            0,
            headerTop - scrollPastHeaderAmount
          );
          await pWaitUntilUndockedFor(scenario, editor);
          assertApprox(
            `Toolbar should be about ${scrollPastHeaderAmount} pixels from the top`,
            header.dom.getBoundingClientRect().top,
            scrollPastHeaderAmount,
            // Arbitrary margin of error. Reduce as permitted.
            4
          );
        });

        it('When scrolling the scroller', async () => {
          // Remember, that the editor is about 200px down the scroller.
          const editor = hook.editor();
          const header = getEditorUi(editor, ui.editor.stickyHeader);
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);

          await pWaitUntilElementScrollFires(
            editor,
            scroller,
            0,
            heights.banner - 100
          );
          // It should not be docked yet.
          await pWaitUntilUndockedFor(scenario, editor);

          // Now scroll further, and it should dock
          const scrollerTop = scroller.dom.getBoundingClientRect().top;
          // 22 was chosen, because it is far enough down the header that it's obvious that it's been
          // cut-off if docking isn't working (visually).
          await pWaitUntilElementScrollFires(
            editor,
            scroller,
            0,
            heights.banner + 22
          );
          await pWaitUntilDockedAtTopFor(scenario, editor, Optional.none());

          assertApprox(
            'Top position should be pretty much at scroller top position',
            header.dom.getBoundingClientRect().top,
            scrollerTop,
            // Arbitrary margin of error. Reduce as permitted
            4
          );

          // Now scroll back a bit.
          await pWaitUntilElementScrollFires(
            editor,
            scroller,
            0,
            heights.banner - 100
          );
          await pWaitUntilUndockedFor(scenario, editor);
        });

        it('When combining scrolling the outer page and the scroller', async () => {
          const editor = hook.editor();
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);
          const scrollerTop = scroller.dom.getBoundingClientRect().top;

          // We will scroll the scroller just before it would dock, and then scroll the window
          // afterwards
          await pWaitUntilTriggersEvent(
            editor,
            'ElementScroll',
            (evt) => evt.target === scroller.dom ? TriggerWaitDecision.Succeed : TriggerWaitDecision.KeepWaiting,
            () => scroller.dom.scrollTo(0, heights.banner - 100)
          );
          await pWaitUntilUndockedFor(scenario, editor);

          // Now, scroll the window down to 130 pixels after the scroller top
          window.scrollTo(0, scrollerTop + 130);

          await pWaitUntilDockedAtTopFor(scenario, editor, Optional.some(0));

          scroller.dom.scrollTo(0, 0);
          await pWaitUntilUndockedFor(scenario, editor);

        });
      });

      context('Testing contextual disappearance', () => {
        const pRunTestWithAdjustment = async (
          editor: Editor,
          adjustments: {
            toDock: {
              action: () => void;
              topValue: Optional<number>;
            };
            toOffscreen: () => void;
            toOnScreen: () => void;
          }): Promise<void> => {
          const header = getEditorUi(editor, ui.editor.stickyHeader);

          // Trigger docking
          adjustments.toDock.action();
          await pWaitUntilDockedAtTopFor(scenario, editor, adjustments.toDock.topValue);
          await pWaitUntilAppears(header);

          // Scroll much further down and check that it disappears
          adjustments.toOffscreen();
          await Waiter.pWait(1000);
          await pWaitUntilDisappears(header);

          // Scroll up again and check it reappears
          adjustments.toOnScreen();
          await pWaitUntilAppears(header);
        };

        it('When scrolling the outer page', async () => {
          const editor = hook.editor();
          const header = getEditorUi(editor, ui.editor.stickyHeader);
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);
          const headerTop = header.dom.getBoundingClientRect().top;
          const scrollerBottom = scroller.dom.getBoundingClientRect().bottom;

          await pRunTestWithAdjustment(editor, {
            toDock: {
              action: () => window.scrollTo(0, headerTop + 30),
              topValue: Optional.some(0)
            },
            toOffscreen: () => window.scrollTo(0, scrollerBottom + 100),
            toOnScreen: () => window.scrollTo(0, scrollerBottom - 100)
          });
        });

        it('When scrolling the scroller', async () => {
          const editor = hook.editor();
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);
          const scrollerTop = scroller.dom.getBoundingClientRect().top;

          await pRunTestWithAdjustment(editor, {
            toDock: {
              action: () => scroller.dom.scrollTo(0, heights.banner + 100),
              topValue: Optional.some(scrollerTop)
            },
            toOffscreen: () => scroller.dom.scrollTo(0, heights.banner + heights.editor + 100),
            toOnScreen: () => scroller.dom.scrollTo(0, heights.banner + heights.editor - 100)
          });
        });
      });

    });

    context('Single scroller and toolbar_location: bottom, but no sticky', () => {
      const hook = TinyHooks.bddSetupFromElement<Editor>(
        {
          ...sharedSettings,
          ui_of_tomorrow: true,
          toolbar_sticky: false,
          toolbar_location: 'bottom',
          toolbar: 'showtestdialog',
          setup: (ed: Editor) => {
            ed.ui.registry.addButton('showtestdialog', {
              type: 'button',
              text: 'Show dialog',
              onAction: () => {
                ed.execCommand('showTestDialog');
              }
            });

            ed.addCommand('showTestDialog', (_ui, _value) => {
              ed.windowManager.open(
                {
                  title: 'Inline dialog',
                  body: {
                    type: 'panel',
                    items: [
                      {
                        type: 'input',
                        name: 'alpha',
                      }
                    ]
                  },
                  buttons: [ ],
                  initialData: {
                    alpha: 'Go'
                  }
                },
                {
                  inline: 'toolbar'
                }
              );
            });
          },
          height: heights.miniEditor,
          inline: scenario.settings.inline
        },
        () => setupSingleScrollerElement(scenario),
        [],
        // Inline mode needs focus for the header to appear
        scenario.settings.inline
      );

      beforeEach(() => resetScrolls(hook.editor()));

      (scenario.settings.inline ? context.skip : context)('toolbar dialog docking', () => {
        const pRunTestWithAdjustment = async (
          editor: Editor,
          adjustments: {
            toDock: { action: () => Promise<void>; optTop: Optional<number> };
            toUndock: () => Promise<void>;
          }): Promise<void> => {
          editor.execCommand('showTestDialog');
          const dialog = await TinyUiActions.pWaitForDialog(editor);

          const elementWithFixed: SugarElement<HTMLElement> = Traverse.parent(dialog).getOrDie(
            'Could not find parent of dialog'
          ) as SugarElement<HTMLElement>;
          // Trigger docking
          await adjustments.toDock.action();
          await pWaitUntilDockedAtTop(elementWithFixed, adjustments.toDock.optTop);

          await adjustments.toUndock();
          await pWaitUntilUndockedAbsolute(elementWithFixed);
        };

        it('When scrolling the outer page', async () => {
          const editor = hook.editor();
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);
          const scrollerTop = scroller.dom.getBoundingClientRect().top;

          await pRunTestWithAdjustment(
            editor,
            {
              toDock: {
                action: () => pWaitUntilScrollWindowFires(editor, 0, scrollerTop + 250),
                optTop: Optional.some(0)
              },
              toUndock: () => pWaitUntilScrollWindowFires(editor, 0, scrollerTop - 100)
            }
          );
        });

        it('When scrolling the scroller', async () => {
          const editor = hook.editor();
          const scroller = getAncestorUi(editor, ui.ancestors.scrollingWrapper);

          await pRunTestWithAdjustment(
            editor,
            {
              toDock: {
                action: () => pWaitUntilElementScrollFires(
                  editor,
                  scroller,
                  0,
                  heights.banner + 50
                ),
                // NOTE: The assertion will do an approximate match for "top"
                optTop: Optional.some(scroller.dom.getBoundingClientRect().top)
              },
              toUndock: () => pWaitUntilElementScrollFires(
                editor,
                scroller,
                0,
                heights.banner - 200
              )
            }
          );

        });
      });
    });

    context('Nested scrollers', () => {
      const setupElement = () => {
        const scroller = SugarElement.fromTag('div');
        Css.setAll(scroller, {
          overflow: 'auto',
          height: `${heights.scroller}px`,
          margin: '0em 2em 2000px 2em',
          outline: '3px solid brown'
        });
        Class.add(scroller, ui.ancestors.scrollingWrapper.className);

        const banner = SugarElement.fromHtml(`<div style="height: ${heights.banner}px; background-color: orange;" />`);

        const target = setupTargetElement(scenario);
        InsertAll.append(
          scroller,
          [
            banner,
            target
          ]
        );

        const outerScroller = SugarElement.fromTag('div');
        Css.setAll(outerScroller, {
          'overflow': 'auto',
          'height': `${heights.outerScroller}px`,
          'padding': '0em 2em 0em 2em',
          'margin-bottom': '2000px',
          'background-color': 'darkgreen'
        });
        Class.add(outerScroller, ui.ancestors.outerScroller.className);

        InsertAll.append(outerScroller, [
          SugarElement.fromHtml(`<div style="height: ${heights.banner}px; background-color: pink;" />`),
          scroller
        ]);
        Insert.append(SugarBody.body(), outerScroller);

        return {
          element: target,
          teardown: () => {
            Remove.remove(outerScroller);
          }
        };
      };

      const hook = TinyHooks.bddSetupFromElement<Editor>(
        {
          ...sharedSettings,
          ui_of_tomorrow: true,
          toolbar_sticky: true,
          height: heights.editor,
          inline: scenario.settings.inline
        },
        () => setupElement(),
        [],
        // Inline mode needs focus for the header to appear
        scenario.settings.inline
      );

      beforeEach(() => resetScrolls(hook.editor()));

      it('When scrolling the outer scroller (contains another scroller)', async () => {
        // Remember, that the editor is about 200px down the scroller.
        const editor = hook.editor();
        const header = getEditorUi(editor, ui.editor.stickyHeader);
        const outerScroller = getAncestorUi(editor, ui.ancestors.outerScroller);

        // There are banners in both scrollers, so we use * 2 to scroll towards the menubar
        await pWaitUntilElementScrollFires(
          editor,
          outerScroller,
          0,
          heights.banner * 2 - 100
        );
        // It should not be docked yet.
        await pWaitUntilUndockedFor(scenario, editor);

        // Now scroll further, and it should dock
        const scrollerTop = outerScroller.dom.getBoundingClientRect().top;

        // 22 was chosen, because it is far enough down the header that it's obvious that it's been
        // cut-off if docking isn't working (visually).
        await pWaitUntilElementScrollFires(
          editor,
          outerScroller,
          0,
          heights.banner * 2 + 22
        );
        await pWaitUntilDockedAtTopFor(scenario, editor, Optional.none());

        assertApprox(
          'Top position should be pretty much at scroller top position',
          header.dom.getBoundingClientRect().top,
          scrollerTop,
          // Arbitrary margin of error. Reduce as permitted
          4
        );

        // Now scroll back a bit until it undocks
        await pWaitUntilElementScrollFires(
          editor,
          outerScroller,
          0,
          heights.banner * 2 - 100
        );

        await pWaitUntilUndockedFor(scenario, editor);
      });
    });
  });

});
