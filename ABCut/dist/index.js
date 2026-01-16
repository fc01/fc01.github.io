"use strict";
const IS_DEV = false;
const equalFn = (a, b) => a === b;
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var Owner = null;
let Transition = null;
let ExternalSourceConfig = null;
let Listener = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;
function createRoot(fn, detachedOwner) {
  const listener = Listener, owner = Owner, unowned = fn.length === 0, current = detachedOwner === void 0 ? owner : detachedOwner, root2 = unowned ? UNOWNED : {
    owned: null,
    cleanups: null,
    context: current ? current.context : null,
    owner: current
  }, updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root2)));
  Owner = root2;
  Listener = null;
  try {
    return runUpdates(updateFn, true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || void 0
  };
  const setter = (value2) => {
    if (typeof value2 === "function") {
      value2 = value2(s.value);
    }
    return writeSignal(s, value2);
  };
  return [readSignal.bind(s), setter];
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}
function createEffect(fn, value, options) {
  runEffects = runUserEffects;
  const c = createComputation(fn, value, false, STALE);
  c.user = true;
  Effects ? Effects.push(c) : updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || void 0;
  updateComputation(c);
  return readSignal.bind(c);
}
function batch(fn) {
  return runUpdates(fn, false);
}
function untrack(fn) {
  if (Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) ;
    return fn();
  } finally {
    Listener = listener;
  }
}
function onMount(fn) {
  createEffect(() => untrack(fn));
}
function onCleanup(fn) {
  if (Owner === null) ;
  else if (Owner.cleanups === null) Owner.cleanups = [fn];
  else Owner.cleanups.push(fn);
  return fn;
}
function readSignal() {
  if (this.sources && this.state) {
    if (this.state === STALE) updateComputation(this);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this), false);
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current = node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);
            else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
        }
        if (Updates.length > 1e6) {
          Updates = [];
          if (IS_DEV) ;
          throw new Error();
        }
      }, false);
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(node, node.value, time);
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner, listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: Owner ? Owner.context : null,
    pure
  };
  if (Owner === null) ;
  else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned) Owner.owned = [c];
      else Owner.owned.push(c);
    }
  }
  return c;
}
function runTop(node) {
  if (node.state === 0) return;
  if (node.state === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (node.state === STALE) {
      updateComputation(node);
    } else if (node.state === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function runUserEffects(queue) {
  let i, userLength = 0;
  for (i = 0; i < queue.length; i++) {
    const e = queue[i];
    if (!e.user) runTop(e);
    else queue[userLength++] = e;
  }
  for (i = 0; i < userLength; i++) runTop(queue[i]);
}
function lookUpstream(node, ignore) {
  node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount)) runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);
      else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(), s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.tOwned) {
    for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
    delete node.tOwned;
  }
  if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  node.state = 0;
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function handleError(err, owner = Owner) {
  const error = castError(err);
  throw error;
}
function createComponent(Comp, props) {
  return untrack(() => Comp(props || {}));
}
const narrowedError = (name) => `Stale read from <${name}>.`;
function Show(props) {
  const keyed = props.keyed;
  const conditionValue = createMemo(() => props.when, void 0, void 0);
  const condition = keyed ? conditionValue : createMemo(conditionValue, void 0, {
    equals: (a, b) => !a === !b
  });
  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      const fn = typeof child === "function" && child.length > 0;
      return fn ? untrack(() => child(keyed ? c : () => {
        if (!untrack(condition)) throw narrowedError("Show");
        return conditionValue();
      })) : child;
    }
    return props.fallback;
  }, void 0, void 0);
}
function reconcileArrays(parentNode, a, b) {
  let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = /* @__PURE__ */ new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart, sequence = 1, t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}
const $$EVENTS = "_$DX_DELEGATE";
function render(code, element, init, options = {}) {
  let disposer;
  createRoot((dispose) => {
    disposer = dispose;
    element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
  }, options.owner);
  return () => {
    disposer();
    element.textContent = "";
  };
}
function template(html, isImportNode, isSVG, isMathML) {
  let node;
  const create = () => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstChild;
  };
  const fn = () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
function delegateEvents(eventNames, document2 = window.document) {
  const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document2.addEventListener(name, eventHandler);
    }
  }
}
function setAttribute(node, name, value) {
  node.removeAttribute(name);
}
function addEventListener(node, name, handler, delegate) {
  {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  }
}
function style(node, value, prev) {
  if (!value) return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return nodeStyle.cssText = value;
  typeof prev === "string" && (nodeStyle.cssText = prev = void 0);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function setStyleProperty(node, name, value) {
  value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (marker !== void 0 && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
}
function eventHandler(e) {
  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const oriCurrentTarget = e.currentTarget;
  const retarget = (value) => Object.defineProperty(e, "target", {
    configurable: true,
    value
  });
  const handleNode = () => {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node.host && typeof node.host !== "string" && !node.host._$host && node.contains(e.target) && retarget(node.host);
    return true;
  };
  const walkUpTree = () => {
    while (handleNode() && (node = node._$host || node.parentNode || node.host)) ;
  };
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (e.composedPath) {
    const path = e.composedPath();
    retarget(path[0]);
    for (let i = 0; i < path.length - 2; i++) {
      node = path[i];
      if (!handleNode()) break;
      if (node._$host) {
        node = node._$host;
        walkUpTree();
        break;
      }
      if (node.parentNode === oriCurrentTarget) {
        break;
      }
    }
  } else walkUpTree();
  retarget(oriTarget);
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value, multi = marker !== void 0;
  parent = multi && current[0] && current[0].parentNode || parent;
  if (t === "string" || t === "number") {
    if (t === "number") {
      value = value.toString();
      if (value === current) return current;
    }
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data !== value && (node.data = value);
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value.nodeType) {
    if (Array.isArray(current)) {
      if (multi) return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else ;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i], prev = current && current[normalized.length], t;
    if (item == null || item === true || item === false) ;
    else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);
      else normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === void 0) return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}
const createAppStore = () => {
  const [fileName2, setFileName2] = createSignal("");
  const [duration2, setDuration2] = createSignal(0);
  const [isPlaying2, setIsPlaying2] = createSignal(false);
  const [currentTime2, setCurrentTime2] = createSignal(0);
  const [selection2, setSelection2] = createSignal({ start: 0, end: 0 });
  const [view2, setView2] = createSignal({ start: 0, length: 0 });
  const [isDragging2, setIsDragging2] = createSignal(false);
  const [audioBuffer2, setAudioBuffer2] = createSignal(void 0);
  return {
    fileName: fileName2,
    setFileName: setFileName2,
    duration: duration2,
    setDuration: setDuration2,
    isPlaying: isPlaying2,
    setIsPlaying: setIsPlaying2,
    currentTime: currentTime2,
    setCurrentTime: setCurrentTime2,
    selection: selection2,
    setSelection: setSelection2,
    view: view2,
    setView: setView2,
    isDragging: isDragging2,
    setIsDragging: setIsDragging2,
    audioBuffer: audioBuffer2,
    setAudioBuffer: setAudioBuffer2
  };
};
const {
  fileName,
  setFileName,
  duration,
  setDuration,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  selection,
  setSelection,
  view,
  setView,
  isDragging,
  setIsDragging,
  audioBuffer,
  setAudioBuffer
} = createRoot(createAppStore);
const floatTo16BitPCM = (output, offset, input) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
  }
};
const writeString = (view2, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view2.setUint8(offset + i, string.charCodeAt(i));
  }
};
const encodeWAV = (options) => {
  const { buffer, selection: selection2 } = options;
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const startSample = Math.floor(selection2.start * sampleRate);
  const endSample = Math.floor(selection2.end * sampleRate);
  const lengthInSamples = endSample - startSample;
  if (lengthInSamples <= 0) {
    throw new Error("Invalid selection length");
  }
  const interleaved = new Float32Array(lengthInSamples * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel).subarray(startSample, endSample);
    for (let i = 0; i < lengthInSamples; i++) {
      interleaved[i * numChannels + channel] = channelData[i];
    }
  }
  const bufferLength = 44 + interleaved.length * 2;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view2 = new DataView(arrayBuffer);
  writeString(view2, 0, "RIFF");
  view2.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view2, 8, "WAVE");
  writeString(view2, 12, "fmt ");
  view2.setUint32(16, 16, true);
  view2.setUint16(20, 1, true);
  view2.setUint16(22, numChannels, true);
  view2.setUint32(24, sampleRate, true);
  view2.setUint32(28, sampleRate * numChannels * 2, true);
  view2.setUint16(32, numChannels * 2, true);
  view2.setUint16(34, 16, true);
  writeString(view2, 36, "data");
  view2.setUint32(40, interleaved.length * 2, true);
  floatTo16BitPCM(view2, 44, interleaved);
  return new Blob([view2], { type: "audio/wav" });
};
const audio = new Audio();
audio.preload = "metadata";
let currentSrcUrl = null;
let decodeCtx;
const getDecodeCtx = () => {
  if (!decodeCtx) {
    decodeCtx = new AudioContext();
  }
  return decodeCtx;
};
audio.addEventListener("play", () => setIsPlaying(true));
audio.addEventListener("pause", () => setIsPlaying(false));
audio.addEventListener("ended", () => setIsPlaying(false));
audio.addEventListener("error", (e) => {
  console.error("Audio error:", e);
  setIsPlaying(false);
});
let rafId;
const syncLoop = () => {
  if (audio.paused) return;
  const now = audio.currentTime;
  const sel = selection();
  if (now >= sel.end) {
    audio.currentTime = sel.start;
  }
  setCurrentTime(audio.currentTime);
  rafId = requestAnimationFrame(syncLoop);
};
audio.addEventListener("play", () => {
  cancelAnimationFrame(rafId);
  syncLoop();
});
audio.addEventListener("pause", () => {
  cancelAnimationFrame(rafId);
});
const loadAudioFile = async (file) => {
  if (currentSrcUrl) {
    URL.revokeObjectURL(currentSrcUrl);
  }
  currentSrcUrl = URL.createObjectURL(file);
  audio.src = currentSrcUrl;
  const ctx = getDecodeCtx();
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(arrayBuffer);
  batch(() => {
    setAudioBuffer(decoded);
    setFileName(file.name);
    setDuration(decoded.duration);
    setSelection({ start: 0, end: decoded.duration });
    setView({ start: 0, length: decoded.duration });
    setCurrentTime(0);
    setIsPlaying(false);
  });
};
const playAudio = () => {
  const sel = selection();
  const curr = audio.currentTime;
  if (curr < sel.start || curr >= sel.end) {
    audio.currentTime = sel.start;
  }
  audio.play().catch(console.error);
};
const playFromA = () => {
  const sel = selection();
  audio.currentTime = sel.start;
  audio.play().catch(console.error);
};
const playToB = () => {
  const sel = selection();
  let start = sel.end - 2;
  if (start < sel.start) start = sel.start;
  audio.currentTime = start;
  audio.play().catch(console.error);
};
const stopAudio = () => {
  audio.pause();
};
const exportSelection = () => {
  const buffer = audioBuffer();
  if (!buffer) return;
  const blob = encodeWAV({
    buffer,
    selection: selection()
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cut_${fileName().replace(/\.[^/.]+$/, "")}.wav`;
  a.click();
  URL.revokeObjectURL(url);
};
var _tmpl$$4 = /* @__PURE__ */ template(`<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;transition:all 0.2s;cursor:pointer"><input type=file accept=audio/* style=display:none><div style=font-size:48px;margin-bottom:16px>🎵</div><div style=font-size:18px;color:#FFFFFF>Drag & Drop Audio File Here</div><div style=font-size:14px;color:#888;margin-top:8px>(MP3, WAV, FLAC, OGG)`);
const DropZone = () => {
  const [isDragging2, setIsDragging2] = createSignal(false);
  let fileInput;
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging2(true);
  };
  const handleDragLeave = () => {
    setIsDragging2(false);
  };
  const handleDrop = (e) => {
    var _a, _b;
    e.preventDefault();
    setIsDragging2(false);
    if ((_b = (_a = e.dataTransfer) == null ? void 0 : _a.files) == null ? void 0 : _b[0]) {
      loadAudioFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileSelect = (e) => {
    var _a;
    const target = e.target;
    if ((_a = target.files) == null ? void 0 : _a[0]) {
      loadAudioFile(target.files[0]);
    }
  };
  return (() => {
    var _el$ = _tmpl$$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling;
    _el$4.nextSibling;
    _el$.$$click = () => fileInput == null ? void 0 : fileInput.click();
    _el$.addEventListener("drop", handleDrop);
    _el$.addEventListener("dragleave", handleDragLeave);
    _el$.addEventListener("dragover", handleDragOver);
    _el$2.addEventListener("change", handleFileSelect);
    var _ref$ = fileInput;
    typeof _ref$ === "function" ? use(_ref$, _el$2) : fileInput = _el$2;
    createRenderEffect((_p$) => {
      var _v$ = isDragging2() ? "2px dashed var(--primary-color)" : "2px dashed var(--border-color)", _v$2 = isDragging2() ? "rgba(187, 134, 252, 0.1)" : "transparent";
      _v$ !== _p$.e && setStyleProperty(_el$, "border", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$, "background-color", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);
var _tmpl$$3 = /* @__PURE__ */ template(`<div style=width:100%;height:100%;display:flex;flex-direction:column;gap:12px><div style="flex:1;display:flex;flex-direction:column;min-height:0;border:1px solid var(--border-color);border-radius:4px;overflow:visible;background:#121212"><div style="height:28px;position:relative;background:#1E1E1E;border-bottom:1px solid var(--border-color);flex-shrink:0;overflow:visible"><div style=position:absolute;top:0;height:100%;width:1px;background:#00FF00;z-index:19></div><div title="A点 (Start)"style=position:absolute;top:0;height:100%;width:24px;background:#00FF00;color:#000;display:flex;justify-content:center;align-items:center;font-size:12px;font-weight:bold;cursor:default;z-index:20;user-select:none>A</div><div style=position:absolute;top:0;height:100%;width:1px;background:#FF0000;z-index:19></div><div title="B点 (End)"style=position:absolute;top:0;height:100%;width:24px;transform:translateX(-100%);background:#FF0000;color:#FFF;display:flex;justify-content:center;align-items:center;font-size:12px;font-weight:bold;cursor:default;z-index:20;user-select:none>B</div></div><div style=flex:1;position:relative;touch-action:none;background:#121212;overflow:visible><canvas style=width:100%;height:100%;display:block;position:absolute;top:0;left:0></canvas><div style=position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none><div style="position:absolute;top:0;left:0;height:100%;background:rgba(0, 0, 0, 0.6)"></div><div style="position:absolute;top:0;right:0;height:100%;background:rgba(0, 0, 0, 0.6)"></div><div style=position:absolute;top:0;width:1px;height:100%;background:#00FF00></div><div style=position:absolute;top:0;width:1px;height:100%;background:#FF0000></div><div style=position:absolute;top:0;width:1px;height:100%;background:#FFFFFF></div></div></div></div><div style=height:60px;position:relative;background-color:#1E1E1E;border-radius:4px;overflow:visible><canvas style=width:100%;height:100%;display:block;position:absolute;top:0;left:0></canvas><div style=position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none><div style="position:absolute;top:0;left:0;height:100%;background:rgba(0, 0, 0, 0.5)"></div><div style="position:absolute;top:0;right:0;height:100%;background:rgba(0, 0, 0, 0.5)"></div><div style=position:absolute;top:0;width:2px;height:100%;background:#00FF00;z-index:10></div><div style=position:absolute;top:0;width:2px;height:100%;background:#FF0000;z-index:10></div><div style="position:absolute;top:0;height:100%;border:2px solid #BB86FC;box-sizing:border-box;z-index:20">`);
const WaveformEditor = () => {
  let mainCanvasRef;
  let mainContainerRef;
  let minimapCanvasRef;
  let minimapContainerRef;
  const [dragMode, setDragMode] = createSignal("none");
  const [minimapMode, setMinimapMode] = createSignal("none");
  const [dragStartX, setDragStartX] = createSignal(0);
  const [dragStartView, setDragStartView] = createSignal(view());
  const [minimapCursor, setMinimapCursor] = createSignal("default");
  const [minimapWidth, setMinimapWidth] = createSignal(0);
  onMount(() => {
    if (minimapContainerRef) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === minimapContainerRef) {
            setMinimapWidth(entry.contentRect.width);
          }
        }
      });
      ro.observe(minimapContainerRef);
      onCleanup(() => ro.disconnect());
    }
  });
  const getTimePct = (time) => {
    const v = view();
    if (v.length <= 0) return "0%";
    const pct = (time - v.start) / v.length * 100;
    return `${pct}%`;
  };
  const getSelectionStartPct = () => {
    const v = view();
    const sel = selection();
    if (v.length <= 0) return 0;
    return (sel.start - v.start) / v.length * 100;
  };
  const getSelectionEndPct = () => {
    const v = view();
    const sel = selection();
    if (v.length <= 0) return 100;
    return (sel.end - v.start) / v.length * 100;
  };
  const getMinimapViewBox = () => {
    const totalDuration = duration();
    const w = minimapWidth();
    if (totalDuration <= 0 || w <= 0) return {
      left: 0,
      width: 0
    };
    const v = view();
    const viewX = v.start / totalDuration * w;
    const viewW = v.length / totalDuration * w;
    return {
      left: viewX,
      width: viewW
    };
  };
  const getMinimapMarkerX = (time) => {
    const totalDuration = duration();
    const w = minimapWidth();
    if (totalDuration <= 0 || w <= 0) return 0;
    return time / totalDuration * w;
  };
  const drawWaveform = (ctx, width, height, buffer, startTime, duration2, color) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1E1E1E";
    ctx.fillRect(0, 0, width, height);
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration2) * sampleRate);
    const lengthInSamples = endSample - startSample;
    if (lengthInSamples <= 0 || width <= 0) return;
    const step = Math.ceil(lengthInSamples / width);
    const numChannels = buffer.numberOfChannels;
    const channelsToDraw = Math.min(numChannels, 2);
    const channelHeight = height / channelsToDraw;
    for (let c = 0; c < channelsToDraw; c++) {
      const data = buffer.getChannelData(c);
      const amp = channelHeight / 2;
      const yOffset = c * channelHeight;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        let min = 1;
        let max = -1;
        const chunkStart = startSample + i * step;
        if (chunkStart >= data.length) break;
        for (let j = 0; j < step; j++) {
          const idx = chunkStart + j;
          if (idx < data.length) {
            const datum = data[idx];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
        }
        if (min > max) {
          min = 0;
          max = 0;
        }
        const barHeight = Math.max(1, (max - min) * amp);
        const barY = yOffset + (1 + min) * amp;
        ctx.fillRect(i, barY, 1, barHeight);
      }
      if (channelsToDraw > 1 && c < channelsToDraw - 1) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(0, yOffset + channelHeight, width, 1);
      }
    }
  };
  const updateCanvas = () => {
    const buffer = audioBuffer();
    if (!buffer) return;
    const v = view();
    if (mainCanvasRef && mainContainerRef) {
      const rect = mainContainerRef.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mainCanvasRef.width = rect.width * dpr;
      mainCanvasRef.height = rect.height * dpr;
      const ctx = mainCanvasRef.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawWaveform(ctx, rect.width, rect.height, buffer, v.start, v.length, "#03DAC6");
      }
    }
    if (minimapCanvasRef && minimapContainerRef) {
      const rect = minimapContainerRef.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      minimapCanvasRef.width = rect.width * dpr;
      minimapCanvasRef.height = rect.height * dpr;
      const ctx = minimapCanvasRef.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawWaveform(ctx, rect.width, rect.height, buffer, 0, duration(), "#555555");
      }
    }
  };
  createEffect(() => {
    audioBuffer();
    view();
    requestAnimationFrame(updateCanvas);
  });
  const handleMainWheel = (e) => {
    e.preventDefault();
    if (!mainContainerRef) return;
    const rect = mainContainerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const v = view();
    const mouseTimeRel = x / width * v.length;
    const mouseTimeAbs = v.start + mouseTimeRel;
    const zoomFactor = 1.1;
    let newLength = v.length;
    if (e.deltaY < 0) {
      newLength /= zoomFactor;
    } else {
      newLength *= zoomFactor;
    }
    newLength = Math.max(0.1, Math.min(newLength, duration()));
    let newStart = mouseTimeAbs - x / width * newLength;
    if (newStart < 0) newStart = 0;
    if (newStart + newLength > duration()) newStart = duration() - newLength;
    setView({
      start: newStart,
      length: newLength
    });
  };
  const handleMainMouseDown = (e) => {
    if (!mainContainerRef) return;
    e.preventDefault();
    const rect = mainContainerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const v = view();
    const clickTime = v.start + x / width * v.length;
    const sel = selection();
    if (e.button === 0) {
      const safeTime = Math.min(clickTime, sel.end - 1e-3);
      setSelection({
        ...sel,
        start: Math.max(0, safeTime)
      });
      setDragMode("start");
    } else if (e.button === 2) {
      const safeTime = Math.max(clickTime, sel.start + 1e-3);
      setSelection({
        ...sel,
        end: Math.min(duration(), safeTime)
      });
      setDragMode("end");
    }
    setIsDragging(true);
  };
  const handleMainMouseMove = (e) => {
    if (!isDragging() || !mainContainerRef) return;
    const mode = dragMode();
    if (mode === "none" || mode === "seek") return;
    const rect = mainContainerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const v = view();
    const rawTime = v.start + x / width * v.length;
    const newTime = Math.max(0, Math.min(rawTime, duration()));
    if (mode === "start") {
      const sel = selection();
      const safeTime = Math.min(newTime, sel.end - 1e-3);
      setSelection({
        ...sel,
        start: Math.max(0, safeTime)
      });
    } else if (mode === "end") {
      const sel = selection();
      const safeTime = Math.max(newTime, sel.start + 1e-3);
      setSelection({
        ...sel,
        end: Math.min(duration(), safeTime)
      });
    }
  };
  const handleContextMenu = (e) => {
    e.preventDefault();
  };
  const handleMinimapHover = (e) => {
    if (isDragging()) return;
    if (!minimapContainerRef) return;
    const rect = minimapContainerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const {
      left: viewX,
      width: viewW
    } = getMinimapViewBox();
    const handleW = 8;
    if (Math.abs(x - viewX) <= handleW) {
      setMinimapCursor("ew-resize");
    } else if (Math.abs(x - (viewX + viewW)) <= handleW) {
      setMinimapCursor("ew-resize");
    } else if (x > viewX && x < viewX + viewW) {
      setMinimapCursor("grab");
    } else {
      setMinimapCursor("pointer");
    }
  };
  const handleMinimapMouseDown = (e) => {
    if (!minimapContainerRef) return;
    e.preventDefault();
    const rect = minimapContainerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const totalDuration = duration();
    const v = view();
    const {
      left: viewX,
      width: viewW
    } = getMinimapViewBox();
    const handleW = 8;
    let mode = "none";
    if (Math.abs(x - viewX) <= handleW) {
      mode = "resize-left";
      setDragStartX(e.clientX);
      setDragStartView({
        start: v.start,
        length: v.length
      });
    } else if (Math.abs(x - (viewX + viewW)) <= handleW) {
      mode = "resize-right";
      setDragStartX(e.clientX);
      setDragStartView({
        start: v.start,
        length: v.length
      });
    } else if (x > viewX && x < viewX + viewW) {
      mode = "pan";
      setMinimapCursor("grabbing");
      setDragStartX(e.clientX);
      setDragStartView({
        start: v.start,
        length: v.length
      });
    } else {
      let newStart = x / width * totalDuration - v.length / 2;
      newStart = Math.max(0, Math.min(newStart, totalDuration - v.length));
      setView({
        start: newStart,
        length: v.length
      });
      mode = "pan";
      setMinimapCursor("grabbing");
      setDragStartX(e.clientX);
      setDragStartView({
        start: newStart,
        length: v.length
      });
    }
    setMinimapMode(mode);
    setIsDragging(true);
  };
  const handleMinimapMouseMove = (e) => {
    if (!isDragging() || minimapMode() === "none" || !minimapContainerRef) return;
    const dx = e.clientX - dragStartX();
    const rect = minimapContainerRef.getBoundingClientRect();
    const width = rect.width;
    const totalDuration = duration();
    const dt = dx / width * totalDuration;
    const startView = dragStartView();
    const mode = minimapMode();
    if (mode === "pan") {
      let newStart = startView.start + dt;
      newStart = Math.max(0, Math.min(newStart, totalDuration - startView.length));
      setView({
        start: newStart,
        length: startView.length
      });
    } else if (mode === "resize-left") {
      const rightEdge = startView.start + startView.length;
      let newStart = startView.start + dt;
      newStart = Math.max(0, Math.min(newStart, rightEdge - 0.1));
      setView({
        start: newStart,
        length: rightEdge - newStart
      });
    } else if (mode === "resize-right") {
      let newLength = startView.length + dt;
      newLength = Math.max(0.1, Math.min(newLength, totalDuration - startView.start));
      setView({
        start: startView.start,
        length: newLength
      });
    }
  };
  const handleGlobalMouseUp = (e) => {
    if (isDragging()) {
      setDragMode("none");
      setMinimapMode("none");
      setIsDragging(false);
      handleMinimapHover(e);
    }
  };
  const handleGlobalMouseMove = (e) => {
    if (dragMode() !== "none") {
      handleMainMouseMove(e);
    }
    if (minimapMode() !== "none") {
      handleMinimapMouseMove(e);
    }
  };
  document.addEventListener("mouseup", handleGlobalMouseUp);
  document.addEventListener("mousemove", handleGlobalMouseMove);
  onCleanup(() => {
    document.removeEventListener("mouseup", handleGlobalMouseUp);
    document.removeEventListener("mousemove", handleGlobalMouseMove);
  });
  const getMainCursor = () => {
    const mode = dragMode();
    if (mode === "start" || mode === "end") return "col-resize";
    return "crosshair";
  };
  return (() => {
    var _el$ = _tmpl$$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$3.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$11.nextSibling, _el$13 = _el$12.nextSibling, _el$14 = _el$2.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling, _el$20 = _el$19.nextSibling, _el$21 = _el$20.nextSibling;
    _el$8.$$contextmenu = handleContextMenu;
    _el$8.$$mousedown = handleMainMouseDown;
    _el$8.addEventListener("wheel", handleMainWheel);
    var _ref$ = mainContainerRef;
    typeof _ref$ === "function" ? use(_ref$, _el$8) : mainContainerRef = _el$8;
    var _ref$2 = mainCanvasRef;
    typeof _ref$2 === "function" ? use(_ref$2, _el$9) : mainCanvasRef = _el$9;
    _el$14.addEventListener("mouseleave", () => !isDragging() && setMinimapCursor("default"));
    _el$14.$$mousemove = handleMinimapHover;
    _el$14.$$mousedown = handleMinimapMouseDown;
    var _ref$3 = minimapContainerRef;
    typeof _ref$3 === "function" ? use(_ref$3, _el$14) : minimapContainerRef = _el$14;
    var _ref$4 = minimapCanvasRef;
    typeof _ref$4 === "function" ? use(_ref$4, _el$15) : minimapCanvasRef = _el$15;
    createRenderEffect((_p$) => {
      var _v$ = getTimePct(selection().start), _v$2 = getTimePct(selection().start), _v$3 = getTimePct(selection().end), _v$4 = getTimePct(selection().end), _v$5 = getMainCursor(), _v$6 = `${Math.max(0, getSelectionStartPct())}%`, _v$7 = `${Math.min(100, getSelectionEndPct())}%`, _v$8 = getTimePct(selection().start), _v$9 = getTimePct(selection().end), _v$0 = getTimePct(currentTime()), _v$1 = minimapCursor(), _v$10 = `${getMinimapViewBox().left}px`, _v$11 = `${getMinimapViewBox().left + getMinimapViewBox().width}px`, _v$12 = `${getMinimapMarkerX(selection().start)}px`, _v$13 = `${getMinimapMarkerX(selection().end)}px`, _v$14 = `${getMinimapViewBox().left}px`, _v$15 = `${getMinimapViewBox().width}px`;
      _v$ !== _p$.e && setStyleProperty(_el$4, "left", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$5, "left", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$6, "left", _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$7, "left", _p$.o = _v$4);
      _v$5 !== _p$.i && setStyleProperty(_el$8, "cursor", _p$.i = _v$5);
      _v$6 !== _p$.n && setStyleProperty(_el$1, "width", _p$.n = _v$6);
      _v$7 !== _p$.s && setStyleProperty(_el$10, "left", _p$.s = _v$7);
      _v$8 !== _p$.h && setStyleProperty(_el$11, "left", _p$.h = _v$8);
      _v$9 !== _p$.r && setStyleProperty(_el$12, "left", _p$.r = _v$9);
      _v$0 !== _p$.d && setStyleProperty(_el$13, "left", _p$.d = _v$0);
      _v$1 !== _p$.l && setStyleProperty(_el$14, "cursor", _p$.l = _v$1);
      _v$10 !== _p$.u && setStyleProperty(_el$17, "width", _p$.u = _v$10);
      _v$11 !== _p$.c && setStyleProperty(_el$18, "left", _p$.c = _v$11);
      _v$12 !== _p$.w && setStyleProperty(_el$19, "left", _p$.w = _v$12);
      _v$13 !== _p$.m && setStyleProperty(_el$20, "left", _p$.m = _v$13);
      _v$14 !== _p$.f && setStyleProperty(_el$21, "left", _p$.f = _v$14);
      _v$15 !== _p$.y && setStyleProperty(_el$21, "width", _p$.y = _v$15);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0,
      d: void 0,
      l: void 0,
      u: void 0,
      c: void 0,
      w: void 0,
      m: void 0,
      f: void 0,
      y: void 0
    });
    return _el$;
  })();
};
delegateEvents(["mousedown", "contextmenu", "mousemove"]);
var _tmpl$$2 = /* @__PURE__ */ template(`<div style=display:flex;align-items:center;gap:24px><div style=font-family:monospace;font-size:14px>s / <!>s</div><div style=display:flex;align-items:center;gap:12px><button title=从A点开始播放 style="width:36px;height:36px;border-radius:50%;border:2px solid #00FF00;background:transparent;color:#00FF00;cursor:pointer;font-size:13px;display:flex;justify-content:center;align-items:center;font-weight:bold">A▶</button><button title=从B点前2秒开始播放 style="width:36px;height:36px;border-radius:50%;border:2px solid #FF0000;background:transparent;color:#FF0000;cursor:pointer;font-size:13px;display:flex;justify-content:center;align-items:center;font-weight:bold">▶B</button><button style=width:36px;height:36px;border-radius:50%;border:none;background:var(--text-color);color:var(--bg-color);cursor:pointer;font-size:18px;display:flex;justify-content:center;align-items:center>`);
const formatTime$1 = (time) => time.toFixed(3);
const Controls = () => {
  const togglePlay = () => {
    if (isPlaying()) {
      stopAudio();
    } else {
      playAudio();
    }
  };
  return (() => {
    var _el$ = _tmpl$$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$5 = _el$3.nextSibling;
    _el$5.nextSibling;
    var _el$6 = _el$2.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling;
    insert(_el$2, () => formatTime$1(currentTime()), _el$3);
    insert(_el$2, () => formatTime$1(duration()), _el$5);
    addEventListener(_el$7, "click", playFromA);
    addEventListener(_el$8, "click", playToB);
    _el$9.$$click = togglePlay;
    insert(_el$9, () => isPlaying() ? "⏸" : "▶");
    return _el$;
  })();
};
delegateEvents(["click"]);
var _tmpl$$1 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:row;align-items:center;gap:12px><div><button>View All</button><div style=width:1px;height:16px;background:#555></div><button>View AB</button></div><div><button title="Jump to A"style=color:#00FF00>A</button><input type=text></div><div><button title="Jump to B"style=color:#FF0000>B</button><input type=text></div><button title="Export selection to WAV">Export WAV`);
const parseTime = (str) => {
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return null;
  return num;
};
const formatTime = (time) => time.toFixed(3);
const Toolbar = () => {
  const [inputA, setInputA] = createSignal(formatTime(selection().start));
  const [inputB, setInputB] = createSignal(formatTime(selection().end));
  createEffect(() => {
    setInputA(formatTime(selection().start));
  });
  createEffect(() => {
    setInputB(formatTime(selection().end));
  });
  const handleABlur = () => {
    const parsed = parseTime(inputA());
    if (parsed !== null && parsed >= 0 && parsed < selection().end - 1e-3) {
      setSelection({
        ...selection(),
        start: Math.max(0, parsed)
      });
    } else {
      setInputA(formatTime(selection().start));
    }
  };
  const handleAKeyDown = (e) => {
    if (e.key === "Enter") {
      handleABlur();
      e.target.blur();
    }
  };
  const handleBBlur = () => {
    const parsed = parseTime(inputB());
    if (parsed !== null && parsed > selection().start + 1e-3 && parsed <= duration()) {
      setSelection({
        ...selection(),
        end: Math.min(duration(), parsed)
      });
    } else {
      setInputB(formatTime(selection().end));
    }
  };
  const handleBKeyDown = (e) => {
    if (e.key === "Enter") {
      handleBBlur();
      e.target.blur();
    }
  };
  const setViewRange = (mode) => {
    const d = duration();
    if (d <= 0) return;
    const s = selection();
    let newStart = 0;
    let newLength = d;
    if (mode === "all") {
      newStart = 0;
      newLength = d;
    } else if (mode === "ab") {
      const selLen = s.end - s.start;
      let targetLen = selLen;
      if (targetLen < 0.1) targetLen = 0.1;
      newLength = Math.min(targetLen, d);
      if (newLength > selLen) {
        const center = s.start + selLen / 2;
        newStart = center - newLength / 2;
      } else {
        newStart = s.start;
      }
    } else if (mode === "a" || mode === "b") {
      newLength = Math.min(1, d);
      const targetTime = mode === "a" ? s.start : s.end;
      newStart = targetTime - newLength / 2;
    }
    if (newStart < 0) newStart = 0;
    if (newStart + newLength > d) newStart = d - newLength;
    setView({
      start: newStart,
      length: newLength
    });
  };
  const groupStyle = {
    "display": "flex",
    "align-items": "center",
    "gap": "8px",
    "background": "#2C2C2C",
    "padding": "4px 8px",
    "border-radius": "6px",
    "border": "1px solid #444"
  };
  const btnStyle = {
    "padding": "4px 8px",
    "background": "transparent",
    "color": "#E0E0E0",
    "border": "none",
    "border-radius": "4px",
    "font-size": "12px",
    "cursor": "pointer",
    "font-family": "monospace",
    "font-weight": "bold",
    "transition": "background 0.2s"
  };
  const inputStyle = {
    "width": "60px",
    "padding": "2px 4px",
    "font-family": "monospace",
    "font-size": "12px",
    "text-align": "center",
    "border": "1px solid #555",
    "border-radius": "3px",
    "background": "#1E1E1E",
    "color": "#FFF",
    "outline": "none"
  };
  const exportBtnStyle = {
    "padding": "6px 16px",
    "background": "var(--primary-color)",
    "color": "#000",
    "border": "none",
    "border-radius": "4px",
    "font-weight": "bold",
    "cursor": "pointer",
    "font-size": "12px",
    "margin-left": "16px"
    // 与其他控件拉开距离
  };
  return (() => {
    var _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling, _el$6 = _el$2.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$9.nextSibling;
    _el$3.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
    _el$3.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "#444");
    _el$3.$$click = () => setViewRange("all");
    _el$5.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "transparent");
    _el$5.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "#444");
    _el$5.$$click = () => setViewRange("ab");
    _el$7.$$click = () => setViewRange("a");
    _el$8.$$keydown = handleAKeyDown;
    _el$8.addEventListener("blur", handleABlur);
    _el$8.$$input = (e) => setInputA(e.currentTarget.value);
    _el$0.$$click = () => setViewRange("b");
    _el$1.$$keydown = handleBKeyDown;
    _el$1.addEventListener("blur", handleBBlur);
    _el$1.$$input = (e) => setInputB(e.currentTarget.value);
    addEventListener(_el$10, "click", exportSelection);
    style(_el$10, exportBtnStyle);
    createRenderEffect((_p$) => {
      var _v$ = groupStyle, _v$2 = btnStyle, _v$3 = btnStyle, _v$4 = groupStyle, _v$5 = {
        ...btnStyle
      }, _v$6 = inputStyle, _v$7 = groupStyle, _v$8 = {
        ...btnStyle
      }, _v$9 = inputStyle;
      _p$.e = style(_el$2, _v$, _p$.e);
      _p$.t = style(_el$3, _v$2, _p$.t);
      _p$.a = style(_el$5, _v$3, _p$.a);
      _p$.o = style(_el$6, _v$4, _p$.o);
      _p$.i = style(_el$7, _v$5, _p$.i);
      _p$.n = style(_el$8, _v$6, _p$.n);
      _p$.s = style(_el$9, _v$7, _p$.s);
      _p$.h = style(_el$0, _v$8, _p$.h);
      _p$.r = style(_el$1, _v$9, _p$.r);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0
    });
    createRenderEffect(() => _el$8.value = inputA());
    createRenderEffect(() => _el$1.value = inputB());
    return _el$;
  })();
};
delegateEvents(["click", "input", "keydown"]);
var _tmpl$ = /* @__PURE__ */ template(`<div style=width:100%;height:100%;display:flex;justify-content:center;align-items:center;padding:24px;box-sizing:border-box><div style=width:100%;height:100%;max-width:100%;max-height:100%>`), _tmpl$2 = /* @__PURE__ */ template(`<div style=display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden><header style="height:80px;flex-shrink:0;background:var(--surface-color);border-bottom:1px solid var(--border-color);display:flex;align-items:center;padding:0 24px;justify-content:space-between"><h1 style=margin:0;font-size:20px;font-weight:bold;width:200px>ABCut</h1><div style=display:flex;justify-content:center;flex:1></div><div style=display:flex;justify-content:flex-end;width:auto></div></header><main style=flex:1;position:relative;overflow:hidden;min-height:0;background:#0a0a0a>`);
const App = () => {
  return (() => {
    var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling, _el$6 = _el$2.nextSibling;
    insert(_el$4, createComponent(Show, {
      get when() {
        return duration() > 0;
      },
      get children() {
        return createComponent(Controls, {});
      }
    }));
    insert(_el$5, createComponent(Show, {
      get when() {
        return duration() > 0;
      },
      get children() {
        return createComponent(Toolbar, {});
      }
    }));
    insert(_el$6, createComponent(Show, {
      get when() {
        return duration() > 0;
      },
      get fallback() {
        return createComponent(DropZone, {});
      },
      get children() {
        var _el$7 = _tmpl$(), _el$8 = _el$7.firstChild;
        insert(_el$8, createComponent(WaveformEditor, {}));
        return _el$7;
      }
    }));
    return _el$;
  })();
};
const root = document.getElementById("app");
if (root instanceof HTMLElement) {
  render(() => App(), root);
}
