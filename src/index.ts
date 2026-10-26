/*! wobbli. Built on Blobatar 2.7.0 by Alain (MIT), see THIRD_PARTY_NOTICES.md. */
// The framework-free core: look() runs generator 1, render() draws a frame, createController() is the
// event-to-state machine. Nothing here touches window or document when imported.
export {
  look, cleanName, normalizeName, styleFromName, traitsOf,
  GENERATOR, GENERATORS, SHAPES, SHAPE_BANDS, SHAPE_MID, TRAITS, HAIRS, FACIAL_HAIR, CLOTHES, GLASSES, HAIR_COLORS, CLOTHES_COLORS, NO_STYLE, STYLE_KEYS, MAX_NAME
} from './look.js';
export type { Look, Pins, Style, ShapeName, TraitKey, Hair, FacialHair, Clothes, Glasses, EyeGeo } from './look.js';
export { render, frame, skeleton, describe, variantOf, blinkDelayOf, styleText, ZONES } from './render.js';
export type { RenderOptions, Frame, FrameZone, HolidayDress, CustomLayers, Motion, ShadowMode, Theme } from './render.js';
export { createController, systemClock, kindOf, EVENT_MAP, EVENT_NAMES, NOTES, WORKING, DEFAULT_STILL_WORKING } from './controller.js';
export type { Controller, ControllerOptions, AvatarState, StateChange, Kind, Cause, Clock, Fidgets, StillWorking } from './controller.js';
export { STATES, STATE, STATE_KEYS, GROUPS, GROUP_NAMES, EVENTS_DATA, loadState, loadGroup, preload, isStateLoaded, registerPack, onPack, allCss } from './registry.js';
export type { StateMeta, VariantMeta, FidgetMeta, StateGroup, EventRow, Pose, PartsPack } from './types.js';
export { geoOf } from './geo.js';
export type { Geo } from './geo.js';
export { headOutline, styleLayers, hasStyle } from './style.js';
export type { StyleLayers } from './style.js';
