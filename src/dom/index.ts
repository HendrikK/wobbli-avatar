// wobbli/dom: mount an avatar on any element, for frameworks without a wrapper (Vue, Svelte, Solid ...).
//
//   const avatar = mount(document.querySelector('#bot'), { name: 'nova' });
//   avatar.emit('tool.query'); avatar.update({ name: 'nova', mouth: false }); avatar.destroy();
export { mount, initialState, pinsOf, renderOptions } from './mount.js';
export type { AvatarProps, AvatarHandle } from './mount.js';
