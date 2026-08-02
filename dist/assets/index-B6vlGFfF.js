(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))n(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function r(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(l){if(l.ep)return;l.ep=!0;const o=r(l);fetch(l.href,o)}})();function Mf(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var nc={exports:{}},j={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Yn=Symbol.for("react.element"),Of=Symbol.for("react.portal"),Bf=Symbol.for("react.fragment"),Af=Symbol.for("react.strict_mode"),jf=Symbol.for("react.profiler"),Hf=Symbol.for("react.provider"),Uf=Symbol.for("react.context"),Wf=Symbol.for("react.forward_ref"),$f=Symbol.for("react.suspense"),Vf=Symbol.for("react.memo"),Gf=Symbol.for("react.lazy"),As=Symbol.iterator;function Yf(e){return e===null||typeof e!="object"?null:(e=As&&e[As]||e["@@iterator"],typeof e=="function"?e:null)}var lc={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},oc=Object.assign,ac={};function Zr(e,t,r){this.props=e,this.context=t,this.refs=ac,this.updater=r||lc}Zr.prototype.isReactComponent={};Zr.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Zr.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function ic(){}ic.prototype=Zr.prototype;function vi(e,t,r){this.props=e,this.context=t,this.refs=ac,this.updater=r||lc}var yi=vi.prototype=new ic;yi.constructor=vi;oc(yi,Zr.prototype);yi.isPureReactComponent=!0;var js=Array.isArray,sc=Object.prototype.hasOwnProperty,xi={current:null},uc={key:!0,ref:!0,__self:!0,__source:!0};function cc(e,t,r){var n,l={},o=null,a=null;if(t!=null)for(n in t.ref!==void 0&&(a=t.ref),t.key!==void 0&&(o=""+t.key),t)sc.call(t,n)&&!uc.hasOwnProperty(n)&&(l[n]=t[n]);var i=arguments.length-2;if(i===1)l.children=r;else if(1<i){for(var s=Array(i),c=0;c<i;c++)s[c]=arguments[c+2];l.children=s}if(e&&e.defaultProps)for(n in i=e.defaultProps,i)l[n]===void 0&&(l[n]=i[n]);return{$$typeof:Yn,type:e,key:o,ref:a,props:l,_owner:xi.current}}function Xf(e,t){return{$$typeof:Yn,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function wi(e){return typeof e=="object"&&e!==null&&e.$$typeof===Yn}function Qf(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(r){return t[r]})}var Hs=/\/+/g;function Xo(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Qf(""+e.key):t.toString(36)}function _l(e,t,r,n,l){var o=typeof e;(o==="undefined"||o==="boolean")&&(e=null);var a=!1;if(e===null)a=!0;else switch(o){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case Yn:case Of:a=!0}}if(a)return a=e,l=l(a),e=n===""?"."+Xo(a,0):n,js(l)?(r="",e!=null&&(r=e.replace(Hs,"$&/")+"/"),_l(l,t,r,"",function(c){return c})):l!=null&&(wi(l)&&(l=Xf(l,r+(!l.key||a&&a.key===l.key?"":(""+l.key).replace(Hs,"$&/")+"/")+e)),t.push(l)),1;if(a=0,n=n===""?".":n+":",js(e))for(var i=0;i<e.length;i++){o=e[i];var s=n+Xo(o,i);a+=_l(o,t,r,s,l)}else if(s=Yf(e),typeof s=="function")for(e=s.call(e),i=0;!(o=e.next()).done;)o=o.value,s=n+Xo(o,i++),a+=_l(o,t,r,s,l);else if(o==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return a}function cl(e,t,r){if(e==null)return e;var n=[],l=0;return _l(e,n,"","",function(o){return t.call(r,o,l++)}),n}function Kf(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(r){(e._status===0||e._status===-1)&&(e._status=1,e._result=r)},function(r){(e._status===0||e._status===-1)&&(e._status=2,e._result=r)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var Ne={current:null},Il={transition:null},Jf={ReactCurrentDispatcher:Ne,ReactCurrentBatchConfig:Il,ReactCurrentOwner:xi};function dc(){throw Error("act(...) is not supported in production builds of React.")}j.Children={map:cl,forEach:function(e,t,r){cl(e,function(){t.apply(this,arguments)},r)},count:function(e){var t=0;return cl(e,function(){t++}),t},toArray:function(e){return cl(e,function(t){return t})||[]},only:function(e){if(!wi(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};j.Component=Zr;j.Fragment=Bf;j.Profiler=jf;j.PureComponent=vi;j.StrictMode=Af;j.Suspense=$f;j.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Jf;j.act=dc;j.cloneElement=function(e,t,r){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var n=oc({},e.props),l=e.key,o=e.ref,a=e._owner;if(t!=null){if(t.ref!==void 0&&(o=t.ref,a=xi.current),t.key!==void 0&&(l=""+t.key),e.type&&e.type.defaultProps)var i=e.type.defaultProps;for(s in t)sc.call(t,s)&&!uc.hasOwnProperty(s)&&(n[s]=t[s]===void 0&&i!==void 0?i[s]:t[s])}var s=arguments.length-2;if(s===1)n.children=r;else if(1<s){i=Array(s);for(var c=0;c<s;c++)i[c]=arguments[c+2];n.children=i}return{$$typeof:Yn,type:e.type,key:l,ref:o,props:n,_owner:a}};j.createContext=function(e){return e={$$typeof:Uf,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Hf,_context:e},e.Consumer=e};j.createElement=cc;j.createFactory=function(e){var t=cc.bind(null,e);return t.type=e,t};j.createRef=function(){return{current:null}};j.forwardRef=function(e){return{$$typeof:Wf,render:e}};j.isValidElement=wi;j.lazy=function(e){return{$$typeof:Gf,_payload:{_status:-1,_result:e},_init:Kf}};j.memo=function(e,t){return{$$typeof:Vf,type:e,compare:t===void 0?null:t}};j.startTransition=function(e){var t=Il.transition;Il.transition={};try{e()}finally{Il.transition=t}};j.unstable_act=dc;j.useCallback=function(e,t){return Ne.current.useCallback(e,t)};j.useContext=function(e){return Ne.current.useContext(e)};j.useDebugValue=function(){};j.useDeferredValue=function(e){return Ne.current.useDeferredValue(e)};j.useEffect=function(e,t){return Ne.current.useEffect(e,t)};j.useId=function(){return Ne.current.useId()};j.useImperativeHandle=function(e,t,r){return Ne.current.useImperativeHandle(e,t,r)};j.useInsertionEffect=function(e,t){return Ne.current.useInsertionEffect(e,t)};j.useLayoutEffect=function(e,t){return Ne.current.useLayoutEffect(e,t)};j.useMemo=function(e,t){return Ne.current.useMemo(e,t)};j.useReducer=function(e,t,r){return Ne.current.useReducer(e,t,r)};j.useRef=function(e){return Ne.current.useRef(e)};j.useState=function(e){return Ne.current.useState(e)};j.useSyncExternalStore=function(e,t,r){return Ne.current.useSyncExternalStore(e,t,r)};j.useTransition=function(){return Ne.current.useTransition()};j.version="18.3.1";nc.exports=j;var b=nc.exports;const u=Mf(b);var Sa={},fc={exports:{}},je={},pc={exports:{}},mc={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(e){function t(_,M){var B=_.length;_.push(M);e:for(;0<B;){var J=B-1>>>1,se=_[J];if(0<l(se,M))_[J]=M,_[B]=se,B=J;else break e}}function r(_){return _.length===0?null:_[0]}function n(_){if(_.length===0)return null;var M=_[0],B=_.pop();if(B!==M){_[0]=B;e:for(var J=0,se=_.length,xr=se>>>1;J<xr;){var tt=2*(J+1)-1,rn=_[tt],_e=tt+1,Ft=_[_e];if(0>l(rn,B))_e<se&&0>l(Ft,rn)?(_[J]=Ft,_[_e]=B,J=_e):(_[J]=rn,_[tt]=B,J=tt);else if(_e<se&&0>l(Ft,B))_[J]=Ft,_[_e]=B,J=_e;else break e}}return M}function l(_,M){var B=_.sortIndex-M.sortIndex;return B!==0?B:_.id-M.id}if(typeof performance=="object"&&typeof performance.now=="function"){var o=performance;e.unstable_now=function(){return o.now()}}else{var a=Date,i=a.now();e.unstable_now=function(){return a.now()-i}}var s=[],c=[],h=1,v=null,g=3,w=!1,E=!1,x=!1,W=typeof setTimeout=="function"?setTimeout:null,f=typeof clearTimeout=="function"?clearTimeout:null,d=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function m(_){for(var M=r(c);M!==null;){if(M.callback===null)n(c);else if(M.startTime<=_)n(c),M.sortIndex=M.expirationTime,t(s,M);else break;M=r(c)}}function k(_){if(x=!1,m(_),!E)if(r(s)!==null)E=!0,Pt(y);else{var M=r(c);M!==null&&tn(k,M.startTime-_)}}function y(_,M){E=!1,x&&(x=!1,f(T),T=-1),w=!0;var B=g;try{for(m(M),v=r(s);v!==null&&(!(v.expirationTime>M)||_&&!ge());){var J=v.callback;if(typeof J=="function"){v.callback=null,g=v.priorityLevel;var se=J(v.expirationTime<=M);M=e.unstable_now(),typeof se=="function"?v.callback=se:v===r(s)&&n(s),m(M)}else n(s);v=r(s)}if(v!==null)var xr=!0;else{var tt=r(c);tt!==null&&tn(k,tt.startTime-M),xr=!1}return xr}finally{v=null,g=B,w=!1}}var R=!1,P=null,T=-1,D=5,O=-1;function ge(){return!(e.unstable_now()-O<D)}function Tt(){if(P!==null){var _=e.unstable_now();O=_;var M=!0;try{M=P(!0,_)}finally{M?nr():(R=!1,P=null)}}else R=!1}var nr;if(typeof d=="function")nr=function(){d(Tt)};else if(typeof MessageChannel<"u"){var Zn=new MessageChannel,bo=Zn.port2;Zn.port1.onmessage=Tt,nr=function(){bo.postMessage(null)}}else nr=function(){W(Tt,0)};function Pt(_){P=_,R||(R=!0,nr())}function tn(_,M){T=W(function(){_(e.unstable_now())},M)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(_){_.callback=null},e.unstable_continueExecution=function(){E||w||(E=!0,Pt(y))},e.unstable_forceFrameRate=function(_){0>_||125<_?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):D=0<_?Math.floor(1e3/_):5},e.unstable_getCurrentPriorityLevel=function(){return g},e.unstable_getFirstCallbackNode=function(){return r(s)},e.unstable_next=function(_){switch(g){case 1:case 2:case 3:var M=3;break;default:M=g}var B=g;g=M;try{return _()}finally{g=B}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(_,M){switch(_){case 1:case 2:case 3:case 4:case 5:break;default:_=3}var B=g;g=_;try{return M()}finally{g=B}},e.unstable_scheduleCallback=function(_,M,B){var J=e.unstable_now();switch(typeof B=="object"&&B!==null?(B=B.delay,B=typeof B=="number"&&0<B?J+B:J):B=J,_){case 1:var se=-1;break;case 2:se=250;break;case 5:se=1073741823;break;case 4:se=1e4;break;default:se=5e3}return se=B+se,_={id:h++,callback:M,priorityLevel:_,startTime:B,expirationTime:se,sortIndex:-1},B>J?(_.sortIndex=B,t(c,_),r(s)===null&&_===r(c)&&(x?(f(T),T=-1):x=!0,tn(k,B-J))):(_.sortIndex=se,t(s,_),E||w||(E=!0,Pt(y))),_},e.unstable_shouldYield=ge,e.unstable_wrapCallback=function(_){var M=g;return function(){var B=g;g=M;try{return _.apply(this,arguments)}finally{g=B}}}})(mc);pc.exports=mc;var Zf=pc.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var qf=b,Ae=Zf;function S(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,r=1;r<arguments.length;r++)t+="&args[]="+encodeURIComponent(arguments[r]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var gc=new Set,Rn={};function vr(e,t){Vr(e,t),Vr(e+"Capture",t)}function Vr(e,t){for(Rn[e]=t,e=0;e<t.length;e++)gc.add(t[e])}var bt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Ea=Object.prototype.hasOwnProperty,ep=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Us={},Ws={};function tp(e){return Ea.call(Ws,e)?!0:Ea.call(Us,e)?!1:ep.test(e)?Ws[e]=!0:(Us[e]=!0,!1)}function rp(e,t,r,n){if(r!==null&&r.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return n?!1:r!==null?!r.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function np(e,t,r,n){if(t===null||typeof t>"u"||rp(e,t,r,n))return!0;if(n)return!1;if(r!==null)switch(r.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function be(e,t,r,n,l,o,a){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=n,this.attributeNamespace=l,this.mustUseProperty=r,this.propertyName=e,this.type=t,this.sanitizeURL=o,this.removeEmptyString=a}var ye={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){ye[e]=new be(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];ye[t]=new be(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){ye[e]=new be(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){ye[e]=new be(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){ye[e]=new be(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){ye[e]=new be(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){ye[e]=new be(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){ye[e]=new be(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){ye[e]=new be(e,5,!1,e.toLowerCase(),null,!1,!1)});var ki=/[\-:]([a-z])/g;function Si(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(ki,Si);ye[t]=new be(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(ki,Si);ye[t]=new be(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(ki,Si);ye[t]=new be(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){ye[e]=new be(e,1,!1,e.toLowerCase(),null,!1,!1)});ye.xlinkHref=new be("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){ye[e]=new be(e,1,!1,e.toLowerCase(),null,!0,!0)});function Ei(e,t,r,n){var l=ye.hasOwnProperty(t)?ye[t]:null;(l!==null?l.type!==0:n||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(np(t,r,l,n)&&(r=null),n||l===null?tp(t)&&(r===null?e.removeAttribute(t):e.setAttribute(t,""+r)):l.mustUseProperty?e[l.propertyName]=r===null?l.type===3?!1:"":r:(t=l.attributeName,n=l.attributeNamespace,r===null?e.removeAttribute(t):(l=l.type,r=l===3||l===4&&r===!0?"":""+r,n?e.setAttributeNS(n,t,r):e.setAttribute(t,r))))}var Rt=qf.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,dl=Symbol.for("react.element"),Nr=Symbol.for("react.portal"),br=Symbol.for("react.fragment"),Ci=Symbol.for("react.strict_mode"),Ca=Symbol.for("react.profiler"),hc=Symbol.for("react.provider"),vc=Symbol.for("react.context"),Ni=Symbol.for("react.forward_ref"),Na=Symbol.for("react.suspense"),ba=Symbol.for("react.suspense_list"),bi=Symbol.for("react.memo"),Ot=Symbol.for("react.lazy"),yc=Symbol.for("react.offscreen"),$s=Symbol.iterator;function on(e){return e===null||typeof e!="object"?null:(e=$s&&e[$s]||e["@@iterator"],typeof e=="function"?e:null)}var te=Object.assign,Qo;function hn(e){if(Qo===void 0)try{throw Error()}catch(r){var t=r.stack.trim().match(/\n( *(at )?)/);Qo=t&&t[1]||""}return`
`+Qo+e}var Ko=!1;function Jo(e,t){if(!e||Ko)return"";Ko=!0;var r=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(c){var n=c}Reflect.construct(e,[],t)}else{try{t.call()}catch(c){n=c}e.call(t.prototype)}else{try{throw Error()}catch(c){n=c}e()}}catch(c){if(c&&n&&typeof c.stack=="string"){for(var l=c.stack.split(`
`),o=n.stack.split(`
`),a=l.length-1,i=o.length-1;1<=a&&0<=i&&l[a]!==o[i];)i--;for(;1<=a&&0<=i;a--,i--)if(l[a]!==o[i]){if(a!==1||i!==1)do if(a--,i--,0>i||l[a]!==o[i]){var s=`
`+l[a].replace(" at new "," at ");return e.displayName&&s.includes("<anonymous>")&&(s=s.replace("<anonymous>",e.displayName)),s}while(1<=a&&0<=i);break}}}finally{Ko=!1,Error.prepareStackTrace=r}return(e=e?e.displayName||e.name:"")?hn(e):""}function lp(e){switch(e.tag){case 5:return hn(e.type);case 16:return hn("Lazy");case 13:return hn("Suspense");case 19:return hn("SuspenseList");case 0:case 2:case 15:return e=Jo(e.type,!1),e;case 11:return e=Jo(e.type.render,!1),e;case 1:return e=Jo(e.type,!0),e;default:return""}}function _a(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case br:return"Fragment";case Nr:return"Portal";case Ca:return"Profiler";case Ci:return"StrictMode";case Na:return"Suspense";case ba:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case vc:return(e.displayName||"Context")+".Consumer";case hc:return(e._context.displayName||"Context")+".Provider";case Ni:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case bi:return t=e.displayName||null,t!==null?t:_a(e.type)||"Memo";case Ot:t=e._payload,e=e._init;try{return _a(e(t))}catch{}}return null}function op(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return _a(t);case 8:return t===Ci?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Zt(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function xc(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function ap(e){var t=xc(e)?"checked":"value",r=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),n=""+e[t];if(!e.hasOwnProperty(t)&&typeof r<"u"&&typeof r.get=="function"&&typeof r.set=="function"){var l=r.get,o=r.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return l.call(this)},set:function(a){n=""+a,o.call(this,a)}}),Object.defineProperty(e,t,{enumerable:r.enumerable}),{getValue:function(){return n},setValue:function(a){n=""+a},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function fl(e){e._valueTracker||(e._valueTracker=ap(e))}function wc(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var r=t.getValue(),n="";return e&&(n=xc(e)?e.checked?"true":"false":e.value),e=n,e!==r?(t.setValue(e),!0):!1}function Al(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function Ia(e,t){var r=t.checked;return te({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:r??e._wrapperState.initialChecked})}function Vs(e,t){var r=t.defaultValue==null?"":t.defaultValue,n=t.checked!=null?t.checked:t.defaultChecked;r=Zt(t.value!=null?t.value:r),e._wrapperState={initialChecked:n,initialValue:r,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function kc(e,t){t=t.checked,t!=null&&Ei(e,"checked",t,!1)}function La(e,t){kc(e,t);var r=Zt(t.value),n=t.type;if(r!=null)n==="number"?(r===0&&e.value===""||e.value!=r)&&(e.value=""+r):e.value!==""+r&&(e.value=""+r);else if(n==="submit"||n==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?Ra(e,t.type,r):t.hasOwnProperty("defaultValue")&&Ra(e,t.type,Zt(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function Gs(e,t,r){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var n=t.type;if(!(n!=="submit"&&n!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,r||t===e.value||(e.value=t),e.defaultValue=t}r=e.name,r!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,r!==""&&(e.name=r)}function Ra(e,t,r){(t!=="number"||Al(e.ownerDocument)!==e)&&(r==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+r&&(e.defaultValue=""+r))}var vn=Array.isArray;function Ar(e,t,r,n){if(e=e.options,t){t={};for(var l=0;l<r.length;l++)t["$"+r[l]]=!0;for(r=0;r<e.length;r++)l=t.hasOwnProperty("$"+e[r].value),e[r].selected!==l&&(e[r].selected=l),l&&n&&(e[r].defaultSelected=!0)}else{for(r=""+Zt(r),t=null,l=0;l<e.length;l++){if(e[l].value===r){e[l].selected=!0,n&&(e[l].defaultSelected=!0);return}t!==null||e[l].disabled||(t=e[l])}t!==null&&(t.selected=!0)}}function Ta(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(S(91));return te({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function Ys(e,t){var r=t.value;if(r==null){if(r=t.children,t=t.defaultValue,r!=null){if(t!=null)throw Error(S(92));if(vn(r)){if(1<r.length)throw Error(S(93));r=r[0]}t=r}t==null&&(t=""),r=t}e._wrapperState={initialValue:Zt(r)}}function Sc(e,t){var r=Zt(t.value),n=Zt(t.defaultValue);r!=null&&(r=""+r,r!==e.value&&(e.value=r),t.defaultValue==null&&e.defaultValue!==r&&(e.defaultValue=r)),n!=null&&(e.defaultValue=""+n)}function Xs(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function Ec(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Pa(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?Ec(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var pl,Cc=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,r,n,l){MSApp.execUnsafeLocalFunction(function(){return e(t,r,n,l)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(pl=pl||document.createElement("div"),pl.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=pl.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function Tn(e,t){if(t){var r=e.firstChild;if(r&&r===e.lastChild&&r.nodeType===3){r.nodeValue=t;return}}e.textContent=t}var wn={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},ip=["Webkit","ms","Moz","O"];Object.keys(wn).forEach(function(e){ip.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),wn[t]=wn[e]})});function Nc(e,t,r){return t==null||typeof t=="boolean"||t===""?"":r||typeof t!="number"||t===0||wn.hasOwnProperty(e)&&wn[e]?(""+t).trim():t+"px"}function bc(e,t){e=e.style;for(var r in t)if(t.hasOwnProperty(r)){var n=r.indexOf("--")===0,l=Nc(r,t[r],n);r==="float"&&(r="cssFloat"),n?e.setProperty(r,l):e[r]=l}}var sp=te({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Fa(e,t){if(t){if(sp[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(S(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(S(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(S(61))}if(t.style!=null&&typeof t.style!="object")throw Error(S(62))}}function za(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Da=null;function _i(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Ma=null,jr=null,Hr=null;function Qs(e){if(e=Kn(e)){if(typeof Ma!="function")throw Error(S(280));var t=e.stateNode;t&&(t=go(t),Ma(e.stateNode,e.type,t))}}function _c(e){jr?Hr?Hr.push(e):Hr=[e]:jr=e}function Ic(){if(jr){var e=jr,t=Hr;if(Hr=jr=null,Qs(e),t)for(e=0;e<t.length;e++)Qs(t[e])}}function Lc(e,t){return e(t)}function Rc(){}var Zo=!1;function Tc(e,t,r){if(Zo)return e(t,r);Zo=!0;try{return Lc(e,t,r)}finally{Zo=!1,(jr!==null||Hr!==null)&&(Rc(),Ic())}}function Pn(e,t){var r=e.stateNode;if(r===null)return null;var n=go(r);if(n===null)return null;r=n[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(n=!n.disabled)||(e=e.type,n=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!n;break e;default:e=!1}if(e)return null;if(r&&typeof r!="function")throw Error(S(231,t,typeof r));return r}var Oa=!1;if(bt)try{var an={};Object.defineProperty(an,"passive",{get:function(){Oa=!0}}),window.addEventListener("test",an,an),window.removeEventListener("test",an,an)}catch{Oa=!1}function up(e,t,r,n,l,o,a,i,s){var c=Array.prototype.slice.call(arguments,3);try{t.apply(r,c)}catch(h){this.onError(h)}}var kn=!1,jl=null,Hl=!1,Ba=null,cp={onError:function(e){kn=!0,jl=e}};function dp(e,t,r,n,l,o,a,i,s){kn=!1,jl=null,up.apply(cp,arguments)}function fp(e,t,r,n,l,o,a,i,s){if(dp.apply(this,arguments),kn){if(kn){var c=jl;kn=!1,jl=null}else throw Error(S(198));Hl||(Hl=!0,Ba=c)}}function yr(e){var t=e,r=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(r=t.return),e=t.return;while(e)}return t.tag===3?r:null}function Pc(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function Ks(e){if(yr(e)!==e)throw Error(S(188))}function pp(e){var t=e.alternate;if(!t){if(t=yr(e),t===null)throw Error(S(188));return t!==e?null:e}for(var r=e,n=t;;){var l=r.return;if(l===null)break;var o=l.alternate;if(o===null){if(n=l.return,n!==null){r=n;continue}break}if(l.child===o.child){for(o=l.child;o;){if(o===r)return Ks(l),e;if(o===n)return Ks(l),t;o=o.sibling}throw Error(S(188))}if(r.return!==n.return)r=l,n=o;else{for(var a=!1,i=l.child;i;){if(i===r){a=!0,r=l,n=o;break}if(i===n){a=!0,n=l,r=o;break}i=i.sibling}if(!a){for(i=o.child;i;){if(i===r){a=!0,r=o,n=l;break}if(i===n){a=!0,n=o,r=l;break}i=i.sibling}if(!a)throw Error(S(189))}}if(r.alternate!==n)throw Error(S(190))}if(r.tag!==3)throw Error(S(188));return r.stateNode.current===r?e:t}function Fc(e){return e=pp(e),e!==null?zc(e):null}function zc(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=zc(e);if(t!==null)return t;e=e.sibling}return null}var Dc=Ae.unstable_scheduleCallback,Js=Ae.unstable_cancelCallback,mp=Ae.unstable_shouldYield,gp=Ae.unstable_requestPaint,ie=Ae.unstable_now,hp=Ae.unstable_getCurrentPriorityLevel,Ii=Ae.unstable_ImmediatePriority,Mc=Ae.unstable_UserBlockingPriority,Ul=Ae.unstable_NormalPriority,vp=Ae.unstable_LowPriority,Oc=Ae.unstable_IdlePriority,co=null,mt=null;function yp(e){if(mt&&typeof mt.onCommitFiberRoot=="function")try{mt.onCommitFiberRoot(co,e,void 0,(e.current.flags&128)===128)}catch{}}var at=Math.clz32?Math.clz32:kp,xp=Math.log,wp=Math.LN2;function kp(e){return e>>>=0,e===0?32:31-(xp(e)/wp|0)|0}var ml=64,gl=4194304;function yn(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Wl(e,t){var r=e.pendingLanes;if(r===0)return 0;var n=0,l=e.suspendedLanes,o=e.pingedLanes,a=r&268435455;if(a!==0){var i=a&~l;i!==0?n=yn(i):(o&=a,o!==0&&(n=yn(o)))}else a=r&~l,a!==0?n=yn(a):o!==0&&(n=yn(o));if(n===0)return 0;if(t!==0&&t!==n&&!(t&l)&&(l=n&-n,o=t&-t,l>=o||l===16&&(o&4194240)!==0))return t;if(n&4&&(n|=r&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=n;0<t;)r=31-at(t),l=1<<r,n|=e[r],t&=~l;return n}function Sp(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Ep(e,t){for(var r=e.suspendedLanes,n=e.pingedLanes,l=e.expirationTimes,o=e.pendingLanes;0<o;){var a=31-at(o),i=1<<a,s=l[a];s===-1?(!(i&r)||i&n)&&(l[a]=Sp(i,t)):s<=t&&(e.expiredLanes|=i),o&=~i}}function Aa(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Bc(){var e=ml;return ml<<=1,!(ml&4194240)&&(ml=64),e}function qo(e){for(var t=[],r=0;31>r;r++)t.push(e);return t}function Xn(e,t,r){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-at(t),e[t]=r}function Cp(e,t){var r=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var n=e.eventTimes;for(e=e.expirationTimes;0<r;){var l=31-at(r),o=1<<l;t[l]=0,n[l]=-1,e[l]=-1,r&=~o}}function Li(e,t){var r=e.entangledLanes|=t;for(e=e.entanglements;r;){var n=31-at(r),l=1<<n;l&t|e[n]&t&&(e[n]|=t),r&=~l}}var G=0;function Ac(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var jc,Ri,Hc,Uc,Wc,ja=!1,hl=[],$t=null,Vt=null,Gt=null,Fn=new Map,zn=new Map,jt=[],Np="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Zs(e,t){switch(e){case"focusin":case"focusout":$t=null;break;case"dragenter":case"dragleave":Vt=null;break;case"mouseover":case"mouseout":Gt=null;break;case"pointerover":case"pointerout":Fn.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":zn.delete(t.pointerId)}}function sn(e,t,r,n,l,o){return e===null||e.nativeEvent!==o?(e={blockedOn:t,domEventName:r,eventSystemFlags:n,nativeEvent:o,targetContainers:[l]},t!==null&&(t=Kn(t),t!==null&&Ri(t)),e):(e.eventSystemFlags|=n,t=e.targetContainers,l!==null&&t.indexOf(l)===-1&&t.push(l),e)}function bp(e,t,r,n,l){switch(t){case"focusin":return $t=sn($t,e,t,r,n,l),!0;case"dragenter":return Vt=sn(Vt,e,t,r,n,l),!0;case"mouseover":return Gt=sn(Gt,e,t,r,n,l),!0;case"pointerover":var o=l.pointerId;return Fn.set(o,sn(Fn.get(o)||null,e,t,r,n,l)),!0;case"gotpointercapture":return o=l.pointerId,zn.set(o,sn(zn.get(o)||null,e,t,r,n,l)),!0}return!1}function $c(e){var t=ar(e.target);if(t!==null){var r=yr(t);if(r!==null){if(t=r.tag,t===13){if(t=Pc(r),t!==null){e.blockedOn=t,Wc(e.priority,function(){Hc(r)});return}}else if(t===3&&r.stateNode.current.memoizedState.isDehydrated){e.blockedOn=r.tag===3?r.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Ll(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var r=Ha(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(r===null){r=e.nativeEvent;var n=new r.constructor(r.type,r);Da=n,r.target.dispatchEvent(n),Da=null}else return t=Kn(r),t!==null&&Ri(t),e.blockedOn=r,!1;t.shift()}return!0}function qs(e,t,r){Ll(e)&&r.delete(t)}function _p(){ja=!1,$t!==null&&Ll($t)&&($t=null),Vt!==null&&Ll(Vt)&&(Vt=null),Gt!==null&&Ll(Gt)&&(Gt=null),Fn.forEach(qs),zn.forEach(qs)}function un(e,t){e.blockedOn===t&&(e.blockedOn=null,ja||(ja=!0,Ae.unstable_scheduleCallback(Ae.unstable_NormalPriority,_p)))}function Dn(e){function t(l){return un(l,e)}if(0<hl.length){un(hl[0],e);for(var r=1;r<hl.length;r++){var n=hl[r];n.blockedOn===e&&(n.blockedOn=null)}}for($t!==null&&un($t,e),Vt!==null&&un(Vt,e),Gt!==null&&un(Gt,e),Fn.forEach(t),zn.forEach(t),r=0;r<jt.length;r++)n=jt[r],n.blockedOn===e&&(n.blockedOn=null);for(;0<jt.length&&(r=jt[0],r.blockedOn===null);)$c(r),r.blockedOn===null&&jt.shift()}var Ur=Rt.ReactCurrentBatchConfig,$l=!0;function Ip(e,t,r,n){var l=G,o=Ur.transition;Ur.transition=null;try{G=1,Ti(e,t,r,n)}finally{G=l,Ur.transition=o}}function Lp(e,t,r,n){var l=G,o=Ur.transition;Ur.transition=null;try{G=4,Ti(e,t,r,n)}finally{G=l,Ur.transition=o}}function Ti(e,t,r,n){if($l){var l=Ha(e,t,r,n);if(l===null)ua(e,t,n,Vl,r),Zs(e,n);else if(bp(l,e,t,r,n))n.stopPropagation();else if(Zs(e,n),t&4&&-1<Np.indexOf(e)){for(;l!==null;){var o=Kn(l);if(o!==null&&jc(o),o=Ha(e,t,r,n),o===null&&ua(e,t,n,Vl,r),o===l)break;l=o}l!==null&&n.stopPropagation()}else ua(e,t,n,null,r)}}var Vl=null;function Ha(e,t,r,n){if(Vl=null,e=_i(n),e=ar(e),e!==null)if(t=yr(e),t===null)e=null;else if(r=t.tag,r===13){if(e=Pc(t),e!==null)return e;e=null}else if(r===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Vl=e,null}function Vc(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(hp()){case Ii:return 1;case Mc:return 4;case Ul:case vp:return 16;case Oc:return 536870912;default:return 16}default:return 16}}var Ut=null,Pi=null,Rl=null;function Gc(){if(Rl)return Rl;var e,t=Pi,r=t.length,n,l="value"in Ut?Ut.value:Ut.textContent,o=l.length;for(e=0;e<r&&t[e]===l[e];e++);var a=r-e;for(n=1;n<=a&&t[r-n]===l[o-n];n++);return Rl=l.slice(e,1<n?1-n:void 0)}function Tl(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function vl(){return!0}function eu(){return!1}function He(e){function t(r,n,l,o,a){this._reactName=r,this._targetInst=l,this.type=n,this.nativeEvent=o,this.target=a,this.currentTarget=null;for(var i in e)e.hasOwnProperty(i)&&(r=e[i],this[i]=r?r(o):o[i]);return this.isDefaultPrevented=(o.defaultPrevented!=null?o.defaultPrevented:o.returnValue===!1)?vl:eu,this.isPropagationStopped=eu,this}return te(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var r=this.nativeEvent;r&&(r.preventDefault?r.preventDefault():typeof r.returnValue!="unknown"&&(r.returnValue=!1),this.isDefaultPrevented=vl)},stopPropagation:function(){var r=this.nativeEvent;r&&(r.stopPropagation?r.stopPropagation():typeof r.cancelBubble!="unknown"&&(r.cancelBubble=!0),this.isPropagationStopped=vl)},persist:function(){},isPersistent:vl}),t}var qr={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Fi=He(qr),Qn=te({},qr,{view:0,detail:0}),Rp=He(Qn),ea,ta,cn,fo=te({},Qn,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:zi,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==cn&&(cn&&e.type==="mousemove"?(ea=e.screenX-cn.screenX,ta=e.screenY-cn.screenY):ta=ea=0,cn=e),ea)},movementY:function(e){return"movementY"in e?e.movementY:ta}}),tu=He(fo),Tp=te({},fo,{dataTransfer:0}),Pp=He(Tp),Fp=te({},Qn,{relatedTarget:0}),ra=He(Fp),zp=te({},qr,{animationName:0,elapsedTime:0,pseudoElement:0}),Dp=He(zp),Mp=te({},qr,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Op=He(Mp),Bp=te({},qr,{data:0}),ru=He(Bp),Ap={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},jp={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Hp={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Up(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Hp[e])?!!t[e]:!1}function zi(){return Up}var Wp=te({},Qn,{key:function(e){if(e.key){var t=Ap[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Tl(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?jp[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:zi,charCode:function(e){return e.type==="keypress"?Tl(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Tl(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),$p=He(Wp),Vp=te({},fo,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),nu=He(Vp),Gp=te({},Qn,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:zi}),Yp=He(Gp),Xp=te({},qr,{propertyName:0,elapsedTime:0,pseudoElement:0}),Qp=He(Xp),Kp=te({},fo,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Jp=He(Kp),Zp=[9,13,27,32],Di=bt&&"CompositionEvent"in window,Sn=null;bt&&"documentMode"in document&&(Sn=document.documentMode);var qp=bt&&"TextEvent"in window&&!Sn,Yc=bt&&(!Di||Sn&&8<Sn&&11>=Sn),lu=" ",ou=!1;function Xc(e,t){switch(e){case"keyup":return Zp.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Qc(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var _r=!1;function em(e,t){switch(e){case"compositionend":return Qc(t);case"keypress":return t.which!==32?null:(ou=!0,lu);case"textInput":return e=t.data,e===lu&&ou?null:e;default:return null}}function tm(e,t){if(_r)return e==="compositionend"||!Di&&Xc(e,t)?(e=Gc(),Rl=Pi=Ut=null,_r=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Yc&&t.locale!=="ko"?null:t.data;default:return null}}var rm={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function au(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!rm[e.type]:t==="textarea"}function Kc(e,t,r,n){_c(n),t=Gl(t,"onChange"),0<t.length&&(r=new Fi("onChange","change",null,r,n),e.push({event:r,listeners:t}))}var En=null,Mn=null;function nm(e){id(e,0)}function po(e){var t=Rr(e);if(wc(t))return e}function lm(e,t){if(e==="change")return t}var Jc=!1;if(bt){var na;if(bt){var la="oninput"in document;if(!la){var iu=document.createElement("div");iu.setAttribute("oninput","return;"),la=typeof iu.oninput=="function"}na=la}else na=!1;Jc=na&&(!document.documentMode||9<document.documentMode)}function su(){En&&(En.detachEvent("onpropertychange",Zc),Mn=En=null)}function Zc(e){if(e.propertyName==="value"&&po(Mn)){var t=[];Kc(t,Mn,e,_i(e)),Tc(nm,t)}}function om(e,t,r){e==="focusin"?(su(),En=t,Mn=r,En.attachEvent("onpropertychange",Zc)):e==="focusout"&&su()}function am(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return po(Mn)}function im(e,t){if(e==="click")return po(t)}function sm(e,t){if(e==="input"||e==="change")return po(t)}function um(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var st=typeof Object.is=="function"?Object.is:um;function On(e,t){if(st(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var r=Object.keys(e),n=Object.keys(t);if(r.length!==n.length)return!1;for(n=0;n<r.length;n++){var l=r[n];if(!Ea.call(t,l)||!st(e[l],t[l]))return!1}return!0}function uu(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function cu(e,t){var r=uu(e);e=0;for(var n;r;){if(r.nodeType===3){if(n=e+r.textContent.length,e<=t&&n>=t)return{node:r,offset:t-e};e=n}e:{for(;r;){if(r.nextSibling){r=r.nextSibling;break e}r=r.parentNode}r=void 0}r=uu(r)}}function qc(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?qc(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function ed(){for(var e=window,t=Al();t instanceof e.HTMLIFrameElement;){try{var r=typeof t.contentWindow.location.href=="string"}catch{r=!1}if(r)e=t.contentWindow;else break;t=Al(e.document)}return t}function Mi(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function cm(e){var t=ed(),r=e.focusedElem,n=e.selectionRange;if(t!==r&&r&&r.ownerDocument&&qc(r.ownerDocument.documentElement,r)){if(n!==null&&Mi(r)){if(t=n.start,e=n.end,e===void 0&&(e=t),"selectionStart"in r)r.selectionStart=t,r.selectionEnd=Math.min(e,r.value.length);else if(e=(t=r.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var l=r.textContent.length,o=Math.min(n.start,l);n=n.end===void 0?o:Math.min(n.end,l),!e.extend&&o>n&&(l=n,n=o,o=l),l=cu(r,o);var a=cu(r,n);l&&a&&(e.rangeCount!==1||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==a.node||e.focusOffset!==a.offset)&&(t=t.createRange(),t.setStart(l.node,l.offset),e.removeAllRanges(),o>n?(e.addRange(t),e.extend(a.node,a.offset)):(t.setEnd(a.node,a.offset),e.addRange(t)))}}for(t=[],e=r;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof r.focus=="function"&&r.focus(),r=0;r<t.length;r++)e=t[r],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var dm=bt&&"documentMode"in document&&11>=document.documentMode,Ir=null,Ua=null,Cn=null,Wa=!1;function du(e,t,r){var n=r.window===r?r.document:r.nodeType===9?r:r.ownerDocument;Wa||Ir==null||Ir!==Al(n)||(n=Ir,"selectionStart"in n&&Mi(n)?n={start:n.selectionStart,end:n.selectionEnd}:(n=(n.ownerDocument&&n.ownerDocument.defaultView||window).getSelection(),n={anchorNode:n.anchorNode,anchorOffset:n.anchorOffset,focusNode:n.focusNode,focusOffset:n.focusOffset}),Cn&&On(Cn,n)||(Cn=n,n=Gl(Ua,"onSelect"),0<n.length&&(t=new Fi("onSelect","select",null,t,r),e.push({event:t,listeners:n}),t.target=Ir)))}function yl(e,t){var r={};return r[e.toLowerCase()]=t.toLowerCase(),r["Webkit"+e]="webkit"+t,r["Moz"+e]="moz"+t,r}var Lr={animationend:yl("Animation","AnimationEnd"),animationiteration:yl("Animation","AnimationIteration"),animationstart:yl("Animation","AnimationStart"),transitionend:yl("Transition","TransitionEnd")},oa={},td={};bt&&(td=document.createElement("div").style,"AnimationEvent"in window||(delete Lr.animationend.animation,delete Lr.animationiteration.animation,delete Lr.animationstart.animation),"TransitionEvent"in window||delete Lr.transitionend.transition);function mo(e){if(oa[e])return oa[e];if(!Lr[e])return e;var t=Lr[e],r;for(r in t)if(t.hasOwnProperty(r)&&r in td)return oa[e]=t[r];return e}var rd=mo("animationend"),nd=mo("animationiteration"),ld=mo("animationstart"),od=mo("transitionend"),ad=new Map,fu="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function er(e,t){ad.set(e,t),vr(t,[e])}for(var aa=0;aa<fu.length;aa++){var ia=fu[aa],fm=ia.toLowerCase(),pm=ia[0].toUpperCase()+ia.slice(1);er(fm,"on"+pm)}er(rd,"onAnimationEnd");er(nd,"onAnimationIteration");er(ld,"onAnimationStart");er("dblclick","onDoubleClick");er("focusin","onFocus");er("focusout","onBlur");er(od,"onTransitionEnd");Vr("onMouseEnter",["mouseout","mouseover"]);Vr("onMouseLeave",["mouseout","mouseover"]);Vr("onPointerEnter",["pointerout","pointerover"]);Vr("onPointerLeave",["pointerout","pointerover"]);vr("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));vr("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));vr("onBeforeInput",["compositionend","keypress","textInput","paste"]);vr("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));vr("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));vr("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var xn="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),mm=new Set("cancel close invalid load scroll toggle".split(" ").concat(xn));function pu(e,t,r){var n=e.type||"unknown-event";e.currentTarget=r,fp(n,t,void 0,e),e.currentTarget=null}function id(e,t){t=(t&4)!==0;for(var r=0;r<e.length;r++){var n=e[r],l=n.event;n=n.listeners;e:{var o=void 0;if(t)for(var a=n.length-1;0<=a;a--){var i=n[a],s=i.instance,c=i.currentTarget;if(i=i.listener,s!==o&&l.isPropagationStopped())break e;pu(l,i,c),o=s}else for(a=0;a<n.length;a++){if(i=n[a],s=i.instance,c=i.currentTarget,i=i.listener,s!==o&&l.isPropagationStopped())break e;pu(l,i,c),o=s}}}if(Hl)throw e=Ba,Hl=!1,Ba=null,e}function Q(e,t){var r=t[Xa];r===void 0&&(r=t[Xa]=new Set);var n=e+"__bubble";r.has(n)||(sd(t,e,2,!1),r.add(n))}function sa(e,t,r){var n=0;t&&(n|=4),sd(r,e,n,t)}var xl="_reactListening"+Math.random().toString(36).slice(2);function Bn(e){if(!e[xl]){e[xl]=!0,gc.forEach(function(r){r!=="selectionchange"&&(mm.has(r)||sa(r,!1,e),sa(r,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[xl]||(t[xl]=!0,sa("selectionchange",!1,t))}}function sd(e,t,r,n){switch(Vc(t)){case 1:var l=Ip;break;case 4:l=Lp;break;default:l=Ti}r=l.bind(null,t,r,e),l=void 0,!Oa||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(l=!0),n?l!==void 0?e.addEventListener(t,r,{capture:!0,passive:l}):e.addEventListener(t,r,!0):l!==void 0?e.addEventListener(t,r,{passive:l}):e.addEventListener(t,r,!1)}function ua(e,t,r,n,l){var o=n;if(!(t&1)&&!(t&2)&&n!==null)e:for(;;){if(n===null)return;var a=n.tag;if(a===3||a===4){var i=n.stateNode.containerInfo;if(i===l||i.nodeType===8&&i.parentNode===l)break;if(a===4)for(a=n.return;a!==null;){var s=a.tag;if((s===3||s===4)&&(s=a.stateNode.containerInfo,s===l||s.nodeType===8&&s.parentNode===l))return;a=a.return}for(;i!==null;){if(a=ar(i),a===null)return;if(s=a.tag,s===5||s===6){n=o=a;continue e}i=i.parentNode}}n=n.return}Tc(function(){var c=o,h=_i(r),v=[];e:{var g=ad.get(e);if(g!==void 0){var w=Fi,E=e;switch(e){case"keypress":if(Tl(r)===0)break e;case"keydown":case"keyup":w=$p;break;case"focusin":E="focus",w=ra;break;case"focusout":E="blur",w=ra;break;case"beforeblur":case"afterblur":w=ra;break;case"click":if(r.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=tu;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=Pp;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=Yp;break;case rd:case nd:case ld:w=Dp;break;case od:w=Qp;break;case"scroll":w=Rp;break;case"wheel":w=Jp;break;case"copy":case"cut":case"paste":w=Op;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=nu}var x=(t&4)!==0,W=!x&&e==="scroll",f=x?g!==null?g+"Capture":null:g;x=[];for(var d=c,m;d!==null;){m=d;var k=m.stateNode;if(m.tag===5&&k!==null&&(m=k,f!==null&&(k=Pn(d,f),k!=null&&x.push(An(d,k,m)))),W)break;d=d.return}0<x.length&&(g=new w(g,E,null,r,h),v.push({event:g,listeners:x}))}}if(!(t&7)){e:{if(g=e==="mouseover"||e==="pointerover",w=e==="mouseout"||e==="pointerout",g&&r!==Da&&(E=r.relatedTarget||r.fromElement)&&(ar(E)||E[_t]))break e;if((w||g)&&(g=h.window===h?h:(g=h.ownerDocument)?g.defaultView||g.parentWindow:window,w?(E=r.relatedTarget||r.toElement,w=c,E=E?ar(E):null,E!==null&&(W=yr(E),E!==W||E.tag!==5&&E.tag!==6)&&(E=null)):(w=null,E=c),w!==E)){if(x=tu,k="onMouseLeave",f="onMouseEnter",d="mouse",(e==="pointerout"||e==="pointerover")&&(x=nu,k="onPointerLeave",f="onPointerEnter",d="pointer"),W=w==null?g:Rr(w),m=E==null?g:Rr(E),g=new x(k,d+"leave",w,r,h),g.target=W,g.relatedTarget=m,k=null,ar(h)===c&&(x=new x(f,d+"enter",E,r,h),x.target=m,x.relatedTarget=W,k=x),W=k,w&&E)t:{for(x=w,f=E,d=0,m=x;m;m=Er(m))d++;for(m=0,k=f;k;k=Er(k))m++;for(;0<d-m;)x=Er(x),d--;for(;0<m-d;)f=Er(f),m--;for(;d--;){if(x===f||f!==null&&x===f.alternate)break t;x=Er(x),f=Er(f)}x=null}else x=null;w!==null&&mu(v,g,w,x,!1),E!==null&&W!==null&&mu(v,W,E,x,!0)}}e:{if(g=c?Rr(c):window,w=g.nodeName&&g.nodeName.toLowerCase(),w==="select"||w==="input"&&g.type==="file")var y=lm;else if(au(g))if(Jc)y=sm;else{y=am;var R=om}else(w=g.nodeName)&&w.toLowerCase()==="input"&&(g.type==="checkbox"||g.type==="radio")&&(y=im);if(y&&(y=y(e,c))){Kc(v,y,r,h);break e}R&&R(e,g,c),e==="focusout"&&(R=g._wrapperState)&&R.controlled&&g.type==="number"&&Ra(g,"number",g.value)}switch(R=c?Rr(c):window,e){case"focusin":(au(R)||R.contentEditable==="true")&&(Ir=R,Ua=c,Cn=null);break;case"focusout":Cn=Ua=Ir=null;break;case"mousedown":Wa=!0;break;case"contextmenu":case"mouseup":case"dragend":Wa=!1,du(v,r,h);break;case"selectionchange":if(dm)break;case"keydown":case"keyup":du(v,r,h)}var P;if(Di)e:{switch(e){case"compositionstart":var T="onCompositionStart";break e;case"compositionend":T="onCompositionEnd";break e;case"compositionupdate":T="onCompositionUpdate";break e}T=void 0}else _r?Xc(e,r)&&(T="onCompositionEnd"):e==="keydown"&&r.keyCode===229&&(T="onCompositionStart");T&&(Yc&&r.locale!=="ko"&&(_r||T!=="onCompositionStart"?T==="onCompositionEnd"&&_r&&(P=Gc()):(Ut=h,Pi="value"in Ut?Ut.value:Ut.textContent,_r=!0)),R=Gl(c,T),0<R.length&&(T=new ru(T,e,null,r,h),v.push({event:T,listeners:R}),P?T.data=P:(P=Qc(r),P!==null&&(T.data=P)))),(P=qp?em(e,r):tm(e,r))&&(c=Gl(c,"onBeforeInput"),0<c.length&&(h=new ru("onBeforeInput","beforeinput",null,r,h),v.push({event:h,listeners:c}),h.data=P))}id(v,t)})}function An(e,t,r){return{instance:e,listener:t,currentTarget:r}}function Gl(e,t){for(var r=t+"Capture",n=[];e!==null;){var l=e,o=l.stateNode;l.tag===5&&o!==null&&(l=o,o=Pn(e,r),o!=null&&n.unshift(An(e,o,l)),o=Pn(e,t),o!=null&&n.push(An(e,o,l))),e=e.return}return n}function Er(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function mu(e,t,r,n,l){for(var o=t._reactName,a=[];r!==null&&r!==n;){var i=r,s=i.alternate,c=i.stateNode;if(s!==null&&s===n)break;i.tag===5&&c!==null&&(i=c,l?(s=Pn(r,o),s!=null&&a.unshift(An(r,s,i))):l||(s=Pn(r,o),s!=null&&a.push(An(r,s,i)))),r=r.return}a.length!==0&&e.push({event:t,listeners:a})}var gm=/\r\n?/g,hm=/\u0000|\uFFFD/g;function gu(e){return(typeof e=="string"?e:""+e).replace(gm,`
`).replace(hm,"")}function wl(e,t,r){if(t=gu(t),gu(e)!==t&&r)throw Error(S(425))}function Yl(){}var $a=null,Va=null;function Ga(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Ya=typeof setTimeout=="function"?setTimeout:void 0,vm=typeof clearTimeout=="function"?clearTimeout:void 0,hu=typeof Promise=="function"?Promise:void 0,ym=typeof queueMicrotask=="function"?queueMicrotask:typeof hu<"u"?function(e){return hu.resolve(null).then(e).catch(xm)}:Ya;function xm(e){setTimeout(function(){throw e})}function ca(e,t){var r=t,n=0;do{var l=r.nextSibling;if(e.removeChild(r),l&&l.nodeType===8)if(r=l.data,r==="/$"){if(n===0){e.removeChild(l),Dn(t);return}n--}else r!=="$"&&r!=="$?"&&r!=="$!"||n++;r=l}while(r);Dn(t)}function Yt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function vu(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="$"||r==="$!"||r==="$?"){if(t===0)return e;t--}else r==="/$"&&t++}e=e.previousSibling}return null}var en=Math.random().toString(36).slice(2),pt="__reactFiber$"+en,jn="__reactProps$"+en,_t="__reactContainer$"+en,Xa="__reactEvents$"+en,wm="__reactListeners$"+en,km="__reactHandles$"+en;function ar(e){var t=e[pt];if(t)return t;for(var r=e.parentNode;r;){if(t=r[_t]||r[pt]){if(r=t.alternate,t.child!==null||r!==null&&r.child!==null)for(e=vu(e);e!==null;){if(r=e[pt])return r;e=vu(e)}return t}e=r,r=e.parentNode}return null}function Kn(e){return e=e[pt]||e[_t],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Rr(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(S(33))}function go(e){return e[jn]||null}var Qa=[],Tr=-1;function tr(e){return{current:e}}function K(e){0>Tr||(e.current=Qa[Tr],Qa[Tr]=null,Tr--)}function X(e,t){Tr++,Qa[Tr]=e.current,e.current=t}var qt={},Se=tr(qt),Re=tr(!1),fr=qt;function Gr(e,t){var r=e.type.contextTypes;if(!r)return qt;var n=e.stateNode;if(n&&n.__reactInternalMemoizedUnmaskedChildContext===t)return n.__reactInternalMemoizedMaskedChildContext;var l={},o;for(o in r)l[o]=t[o];return n&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=l),l}function Te(e){return e=e.childContextTypes,e!=null}function Xl(){K(Re),K(Se)}function yu(e,t,r){if(Se.current!==qt)throw Error(S(168));X(Se,t),X(Re,r)}function ud(e,t,r){var n=e.stateNode;if(t=t.childContextTypes,typeof n.getChildContext!="function")return r;n=n.getChildContext();for(var l in n)if(!(l in t))throw Error(S(108,op(e)||"Unknown",l));return te({},r,n)}function Ql(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||qt,fr=Se.current,X(Se,e),X(Re,Re.current),!0}function xu(e,t,r){var n=e.stateNode;if(!n)throw Error(S(169));r?(e=ud(e,t,fr),n.__reactInternalMemoizedMergedChildContext=e,K(Re),K(Se),X(Se,e)):K(Re),X(Re,r)}var kt=null,ho=!1,da=!1;function cd(e){kt===null?kt=[e]:kt.push(e)}function Sm(e){ho=!0,cd(e)}function rr(){if(!da&&kt!==null){da=!0;var e=0,t=G;try{var r=kt;for(G=1;e<r.length;e++){var n=r[e];do n=n(!0);while(n!==null)}kt=null,ho=!1}catch(l){throw kt!==null&&(kt=kt.slice(e+1)),Dc(Ii,rr),l}finally{G=t,da=!1}}return null}var Pr=[],Fr=0,Kl=null,Jl=0,Qe=[],Ke=0,pr=null,St=1,Et="";function lr(e,t){Pr[Fr++]=Jl,Pr[Fr++]=Kl,Kl=e,Jl=t}function dd(e,t,r){Qe[Ke++]=St,Qe[Ke++]=Et,Qe[Ke++]=pr,pr=e;var n=St;e=Et;var l=32-at(n)-1;n&=~(1<<l),r+=1;var o=32-at(t)+l;if(30<o){var a=l-l%5;o=(n&(1<<a)-1).toString(32),n>>=a,l-=a,St=1<<32-at(t)+l|r<<l|n,Et=o+e}else St=1<<o|r<<l|n,Et=e}function Oi(e){e.return!==null&&(lr(e,1),dd(e,1,0))}function Bi(e){for(;e===Kl;)Kl=Pr[--Fr],Pr[Fr]=null,Jl=Pr[--Fr],Pr[Fr]=null;for(;e===pr;)pr=Qe[--Ke],Qe[Ke]=null,Et=Qe[--Ke],Qe[Ke]=null,St=Qe[--Ke],Qe[Ke]=null}var Be=null,Oe=null,Z=!1,ot=null;function fd(e,t){var r=Je(5,null,null,0);r.elementType="DELETED",r.stateNode=t,r.return=e,t=e.deletions,t===null?(e.deletions=[r],e.flags|=16):t.push(r)}function wu(e,t){switch(e.tag){case 5:var r=e.type;return t=t.nodeType!==1||r.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Be=e,Oe=Yt(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Be=e,Oe=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(r=pr!==null?{id:St,overflow:Et}:null,e.memoizedState={dehydrated:t,treeContext:r,retryLane:1073741824},r=Je(18,null,null,0),r.stateNode=t,r.return=e,e.child=r,Be=e,Oe=null,!0):!1;default:return!1}}function Ka(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Ja(e){if(Z){var t=Oe;if(t){var r=t;if(!wu(e,t)){if(Ka(e))throw Error(S(418));t=Yt(r.nextSibling);var n=Be;t&&wu(e,t)?fd(n,r):(e.flags=e.flags&-4097|2,Z=!1,Be=e)}}else{if(Ka(e))throw Error(S(418));e.flags=e.flags&-4097|2,Z=!1,Be=e}}}function ku(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Be=e}function kl(e){if(e!==Be)return!1;if(!Z)return ku(e),Z=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!Ga(e.type,e.memoizedProps)),t&&(t=Oe)){if(Ka(e))throw pd(),Error(S(418));for(;t;)fd(e,t),t=Yt(t.nextSibling)}if(ku(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(S(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="/$"){if(t===0){Oe=Yt(e.nextSibling);break e}t--}else r!=="$"&&r!=="$!"&&r!=="$?"||t++}e=e.nextSibling}Oe=null}}else Oe=Be?Yt(e.stateNode.nextSibling):null;return!0}function pd(){for(var e=Oe;e;)e=Yt(e.nextSibling)}function Yr(){Oe=Be=null,Z=!1}function Ai(e){ot===null?ot=[e]:ot.push(e)}var Em=Rt.ReactCurrentBatchConfig;function dn(e,t,r){if(e=r.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(r._owner){if(r=r._owner,r){if(r.tag!==1)throw Error(S(309));var n=r.stateNode}if(!n)throw Error(S(147,e));var l=n,o=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===o?t.ref:(t=function(a){var i=l.refs;a===null?delete i[o]:i[o]=a},t._stringRef=o,t)}if(typeof e!="string")throw Error(S(284));if(!r._owner)throw Error(S(290,e))}return e}function Sl(e,t){throw e=Object.prototype.toString.call(t),Error(S(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Su(e){var t=e._init;return t(e._payload)}function md(e){function t(f,d){if(e){var m=f.deletions;m===null?(f.deletions=[d],f.flags|=16):m.push(d)}}function r(f,d){if(!e)return null;for(;d!==null;)t(f,d),d=d.sibling;return null}function n(f,d){for(f=new Map;d!==null;)d.key!==null?f.set(d.key,d):f.set(d.index,d),d=d.sibling;return f}function l(f,d){return f=Jt(f,d),f.index=0,f.sibling=null,f}function o(f,d,m){return f.index=m,e?(m=f.alternate,m!==null?(m=m.index,m<d?(f.flags|=2,d):m):(f.flags|=2,d)):(f.flags|=1048576,d)}function a(f){return e&&f.alternate===null&&(f.flags|=2),f}function i(f,d,m,k){return d===null||d.tag!==6?(d=ya(m,f.mode,k),d.return=f,d):(d=l(d,m),d.return=f,d)}function s(f,d,m,k){var y=m.type;return y===br?h(f,d,m.props.children,k,m.key):d!==null&&(d.elementType===y||typeof y=="object"&&y!==null&&y.$$typeof===Ot&&Su(y)===d.type)?(k=l(d,m.props),k.ref=dn(f,d,m),k.return=f,k):(k=Bl(m.type,m.key,m.props,null,f.mode,k),k.ref=dn(f,d,m),k.return=f,k)}function c(f,d,m,k){return d===null||d.tag!==4||d.stateNode.containerInfo!==m.containerInfo||d.stateNode.implementation!==m.implementation?(d=xa(m,f.mode,k),d.return=f,d):(d=l(d,m.children||[]),d.return=f,d)}function h(f,d,m,k,y){return d===null||d.tag!==7?(d=cr(m,f.mode,k,y),d.return=f,d):(d=l(d,m),d.return=f,d)}function v(f,d,m){if(typeof d=="string"&&d!==""||typeof d=="number")return d=ya(""+d,f.mode,m),d.return=f,d;if(typeof d=="object"&&d!==null){switch(d.$$typeof){case dl:return m=Bl(d.type,d.key,d.props,null,f.mode,m),m.ref=dn(f,null,d),m.return=f,m;case Nr:return d=xa(d,f.mode,m),d.return=f,d;case Ot:var k=d._init;return v(f,k(d._payload),m)}if(vn(d)||on(d))return d=cr(d,f.mode,m,null),d.return=f,d;Sl(f,d)}return null}function g(f,d,m,k){var y=d!==null?d.key:null;if(typeof m=="string"&&m!==""||typeof m=="number")return y!==null?null:i(f,d,""+m,k);if(typeof m=="object"&&m!==null){switch(m.$$typeof){case dl:return m.key===y?s(f,d,m,k):null;case Nr:return m.key===y?c(f,d,m,k):null;case Ot:return y=m._init,g(f,d,y(m._payload),k)}if(vn(m)||on(m))return y!==null?null:h(f,d,m,k,null);Sl(f,m)}return null}function w(f,d,m,k,y){if(typeof k=="string"&&k!==""||typeof k=="number")return f=f.get(m)||null,i(d,f,""+k,y);if(typeof k=="object"&&k!==null){switch(k.$$typeof){case dl:return f=f.get(k.key===null?m:k.key)||null,s(d,f,k,y);case Nr:return f=f.get(k.key===null?m:k.key)||null,c(d,f,k,y);case Ot:var R=k._init;return w(f,d,m,R(k._payload),y)}if(vn(k)||on(k))return f=f.get(m)||null,h(d,f,k,y,null);Sl(d,k)}return null}function E(f,d,m,k){for(var y=null,R=null,P=d,T=d=0,D=null;P!==null&&T<m.length;T++){P.index>T?(D=P,P=null):D=P.sibling;var O=g(f,P,m[T],k);if(O===null){P===null&&(P=D);break}e&&P&&O.alternate===null&&t(f,P),d=o(O,d,T),R===null?y=O:R.sibling=O,R=O,P=D}if(T===m.length)return r(f,P),Z&&lr(f,T),y;if(P===null){for(;T<m.length;T++)P=v(f,m[T],k),P!==null&&(d=o(P,d,T),R===null?y=P:R.sibling=P,R=P);return Z&&lr(f,T),y}for(P=n(f,P);T<m.length;T++)D=w(P,f,T,m[T],k),D!==null&&(e&&D.alternate!==null&&P.delete(D.key===null?T:D.key),d=o(D,d,T),R===null?y=D:R.sibling=D,R=D);return e&&P.forEach(function(ge){return t(f,ge)}),Z&&lr(f,T),y}function x(f,d,m,k){var y=on(m);if(typeof y!="function")throw Error(S(150));if(m=y.call(m),m==null)throw Error(S(151));for(var R=y=null,P=d,T=d=0,D=null,O=m.next();P!==null&&!O.done;T++,O=m.next()){P.index>T?(D=P,P=null):D=P.sibling;var ge=g(f,P,O.value,k);if(ge===null){P===null&&(P=D);break}e&&P&&ge.alternate===null&&t(f,P),d=o(ge,d,T),R===null?y=ge:R.sibling=ge,R=ge,P=D}if(O.done)return r(f,P),Z&&lr(f,T),y;if(P===null){for(;!O.done;T++,O=m.next())O=v(f,O.value,k),O!==null&&(d=o(O,d,T),R===null?y=O:R.sibling=O,R=O);return Z&&lr(f,T),y}for(P=n(f,P);!O.done;T++,O=m.next())O=w(P,f,T,O.value,k),O!==null&&(e&&O.alternate!==null&&P.delete(O.key===null?T:O.key),d=o(O,d,T),R===null?y=O:R.sibling=O,R=O);return e&&P.forEach(function(Tt){return t(f,Tt)}),Z&&lr(f,T),y}function W(f,d,m,k){if(typeof m=="object"&&m!==null&&m.type===br&&m.key===null&&(m=m.props.children),typeof m=="object"&&m!==null){switch(m.$$typeof){case dl:e:{for(var y=m.key,R=d;R!==null;){if(R.key===y){if(y=m.type,y===br){if(R.tag===7){r(f,R.sibling),d=l(R,m.props.children),d.return=f,f=d;break e}}else if(R.elementType===y||typeof y=="object"&&y!==null&&y.$$typeof===Ot&&Su(y)===R.type){r(f,R.sibling),d=l(R,m.props),d.ref=dn(f,R,m),d.return=f,f=d;break e}r(f,R);break}else t(f,R);R=R.sibling}m.type===br?(d=cr(m.props.children,f.mode,k,m.key),d.return=f,f=d):(k=Bl(m.type,m.key,m.props,null,f.mode,k),k.ref=dn(f,d,m),k.return=f,f=k)}return a(f);case Nr:e:{for(R=m.key;d!==null;){if(d.key===R)if(d.tag===4&&d.stateNode.containerInfo===m.containerInfo&&d.stateNode.implementation===m.implementation){r(f,d.sibling),d=l(d,m.children||[]),d.return=f,f=d;break e}else{r(f,d);break}else t(f,d);d=d.sibling}d=xa(m,f.mode,k),d.return=f,f=d}return a(f);case Ot:return R=m._init,W(f,d,R(m._payload),k)}if(vn(m))return E(f,d,m,k);if(on(m))return x(f,d,m,k);Sl(f,m)}return typeof m=="string"&&m!==""||typeof m=="number"?(m=""+m,d!==null&&d.tag===6?(r(f,d.sibling),d=l(d,m),d.return=f,f=d):(r(f,d),d=ya(m,f.mode,k),d.return=f,f=d),a(f)):r(f,d)}return W}var Xr=md(!0),gd=md(!1),Zl=tr(null),ql=null,zr=null,ji=null;function Hi(){ji=zr=ql=null}function Ui(e){var t=Zl.current;K(Zl),e._currentValue=t}function Za(e,t,r){for(;e!==null;){var n=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,n!==null&&(n.childLanes|=t)):n!==null&&(n.childLanes&t)!==t&&(n.childLanes|=t),e===r)break;e=e.return}}function Wr(e,t){ql=e,ji=zr=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(Le=!0),e.firstContext=null)}function qe(e){var t=e._currentValue;if(ji!==e)if(e={context:e,memoizedValue:t,next:null},zr===null){if(ql===null)throw Error(S(308));zr=e,ql.dependencies={lanes:0,firstContext:e}}else zr=zr.next=e;return t}var ir=null;function Wi(e){ir===null?ir=[e]:ir.push(e)}function hd(e,t,r,n){var l=t.interleaved;return l===null?(r.next=r,Wi(t)):(r.next=l.next,l.next=r),t.interleaved=r,It(e,n)}function It(e,t){e.lanes|=t;var r=e.alternate;for(r!==null&&(r.lanes|=t),r=e,e=e.return;e!==null;)e.childLanes|=t,r=e.alternate,r!==null&&(r.childLanes|=t),r=e,e=e.return;return r.tag===3?r.stateNode:null}var Bt=!1;function $i(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function vd(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function Nt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function Xt(e,t,r){var n=e.updateQueue;if(n===null)return null;if(n=n.shared,$&2){var l=n.pending;return l===null?t.next=t:(t.next=l.next,l.next=t),n.pending=t,It(e,r)}return l=n.interleaved,l===null?(t.next=t,Wi(n)):(t.next=l.next,l.next=t),n.interleaved=t,It(e,r)}function Pl(e,t,r){if(t=t.updateQueue,t!==null&&(t=t.shared,(r&4194240)!==0)){var n=t.lanes;n&=e.pendingLanes,r|=n,t.lanes=r,Li(e,r)}}function Eu(e,t){var r=e.updateQueue,n=e.alternate;if(n!==null&&(n=n.updateQueue,r===n)){var l=null,o=null;if(r=r.firstBaseUpdate,r!==null){do{var a={eventTime:r.eventTime,lane:r.lane,tag:r.tag,payload:r.payload,callback:r.callback,next:null};o===null?l=o=a:o=o.next=a,r=r.next}while(r!==null);o===null?l=o=t:o=o.next=t}else l=o=t;r={baseState:n.baseState,firstBaseUpdate:l,lastBaseUpdate:o,shared:n.shared,effects:n.effects},e.updateQueue=r;return}e=r.lastBaseUpdate,e===null?r.firstBaseUpdate=t:e.next=t,r.lastBaseUpdate=t}function eo(e,t,r,n){var l=e.updateQueue;Bt=!1;var o=l.firstBaseUpdate,a=l.lastBaseUpdate,i=l.shared.pending;if(i!==null){l.shared.pending=null;var s=i,c=s.next;s.next=null,a===null?o=c:a.next=c,a=s;var h=e.alternate;h!==null&&(h=h.updateQueue,i=h.lastBaseUpdate,i!==a&&(i===null?h.firstBaseUpdate=c:i.next=c,h.lastBaseUpdate=s))}if(o!==null){var v=l.baseState;a=0,h=c=s=null,i=o;do{var g=i.lane,w=i.eventTime;if((n&g)===g){h!==null&&(h=h.next={eventTime:w,lane:0,tag:i.tag,payload:i.payload,callback:i.callback,next:null});e:{var E=e,x=i;switch(g=t,w=r,x.tag){case 1:if(E=x.payload,typeof E=="function"){v=E.call(w,v,g);break e}v=E;break e;case 3:E.flags=E.flags&-65537|128;case 0:if(E=x.payload,g=typeof E=="function"?E.call(w,v,g):E,g==null)break e;v=te({},v,g);break e;case 2:Bt=!0}}i.callback!==null&&i.lane!==0&&(e.flags|=64,g=l.effects,g===null?l.effects=[i]:g.push(i))}else w={eventTime:w,lane:g,tag:i.tag,payload:i.payload,callback:i.callback,next:null},h===null?(c=h=w,s=v):h=h.next=w,a|=g;if(i=i.next,i===null){if(i=l.shared.pending,i===null)break;g=i,i=g.next,g.next=null,l.lastBaseUpdate=g,l.shared.pending=null}}while(!0);if(h===null&&(s=v),l.baseState=s,l.firstBaseUpdate=c,l.lastBaseUpdate=h,t=l.shared.interleaved,t!==null){l=t;do a|=l.lane,l=l.next;while(l!==t)}else o===null&&(l.shared.lanes=0);gr|=a,e.lanes=a,e.memoizedState=v}}function Cu(e,t,r){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var n=e[t],l=n.callback;if(l!==null){if(n.callback=null,n=r,typeof l!="function")throw Error(S(191,l));l.call(n)}}}var Jn={},gt=tr(Jn),Hn=tr(Jn),Un=tr(Jn);function sr(e){if(e===Jn)throw Error(S(174));return e}function Vi(e,t){switch(X(Un,t),X(Hn,e),X(gt,Jn),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:Pa(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=Pa(t,e)}K(gt),X(gt,t)}function Qr(){K(gt),K(Hn),K(Un)}function yd(e){sr(Un.current);var t=sr(gt.current),r=Pa(t,e.type);t!==r&&(X(Hn,e),X(gt,r))}function Gi(e){Hn.current===e&&(K(gt),K(Hn))}var q=tr(0);function to(e){for(var t=e;t!==null;){if(t.tag===13){var r=t.memoizedState;if(r!==null&&(r=r.dehydrated,r===null||r.data==="$?"||r.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var fa=[];function Yi(){for(var e=0;e<fa.length;e++)fa[e]._workInProgressVersionPrimary=null;fa.length=0}var Fl=Rt.ReactCurrentDispatcher,pa=Rt.ReactCurrentBatchConfig,mr=0,ee=null,de=null,pe=null,ro=!1,Nn=!1,Wn=0,Cm=0;function xe(){throw Error(S(321))}function Xi(e,t){if(t===null)return!1;for(var r=0;r<t.length&&r<e.length;r++)if(!st(e[r],t[r]))return!1;return!0}function Qi(e,t,r,n,l,o){if(mr=o,ee=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Fl.current=e===null||e.memoizedState===null?Im:Lm,e=r(n,l),Nn){o=0;do{if(Nn=!1,Wn=0,25<=o)throw Error(S(301));o+=1,pe=de=null,t.updateQueue=null,Fl.current=Rm,e=r(n,l)}while(Nn)}if(Fl.current=no,t=de!==null&&de.next!==null,mr=0,pe=de=ee=null,ro=!1,t)throw Error(S(300));return e}function Ki(){var e=Wn!==0;return Wn=0,e}function ft(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return pe===null?ee.memoizedState=pe=e:pe=pe.next=e,pe}function et(){if(de===null){var e=ee.alternate;e=e!==null?e.memoizedState:null}else e=de.next;var t=pe===null?ee.memoizedState:pe.next;if(t!==null)pe=t,de=e;else{if(e===null)throw Error(S(310));de=e,e={memoizedState:de.memoizedState,baseState:de.baseState,baseQueue:de.baseQueue,queue:de.queue,next:null},pe===null?ee.memoizedState=pe=e:pe=pe.next=e}return pe}function $n(e,t){return typeof t=="function"?t(e):t}function ma(e){var t=et(),r=t.queue;if(r===null)throw Error(S(311));r.lastRenderedReducer=e;var n=de,l=n.baseQueue,o=r.pending;if(o!==null){if(l!==null){var a=l.next;l.next=o.next,o.next=a}n.baseQueue=l=o,r.pending=null}if(l!==null){o=l.next,n=n.baseState;var i=a=null,s=null,c=o;do{var h=c.lane;if((mr&h)===h)s!==null&&(s=s.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),n=c.hasEagerState?c.eagerState:e(n,c.action);else{var v={lane:h,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};s===null?(i=s=v,a=n):s=s.next=v,ee.lanes|=h,gr|=h}c=c.next}while(c!==null&&c!==o);s===null?a=n:s.next=i,st(n,t.memoizedState)||(Le=!0),t.memoizedState=n,t.baseState=a,t.baseQueue=s,r.lastRenderedState=n}if(e=r.interleaved,e!==null){l=e;do o=l.lane,ee.lanes|=o,gr|=o,l=l.next;while(l!==e)}else l===null&&(r.lanes=0);return[t.memoizedState,r.dispatch]}function ga(e){var t=et(),r=t.queue;if(r===null)throw Error(S(311));r.lastRenderedReducer=e;var n=r.dispatch,l=r.pending,o=t.memoizedState;if(l!==null){r.pending=null;var a=l=l.next;do o=e(o,a.action),a=a.next;while(a!==l);st(o,t.memoizedState)||(Le=!0),t.memoizedState=o,t.baseQueue===null&&(t.baseState=o),r.lastRenderedState=o}return[o,n]}function xd(){}function wd(e,t){var r=ee,n=et(),l=t(),o=!st(n.memoizedState,l);if(o&&(n.memoizedState=l,Le=!0),n=n.queue,Ji(Ed.bind(null,r,n,e),[e]),n.getSnapshot!==t||o||pe!==null&&pe.memoizedState.tag&1){if(r.flags|=2048,Vn(9,Sd.bind(null,r,n,l,t),void 0,null),me===null)throw Error(S(349));mr&30||kd(r,t,l)}return l}function kd(e,t,r){e.flags|=16384,e={getSnapshot:t,value:r},t=ee.updateQueue,t===null?(t={lastEffect:null,stores:null},ee.updateQueue=t,t.stores=[e]):(r=t.stores,r===null?t.stores=[e]:r.push(e))}function Sd(e,t,r,n){t.value=r,t.getSnapshot=n,Cd(t)&&Nd(e)}function Ed(e,t,r){return r(function(){Cd(t)&&Nd(e)})}function Cd(e){var t=e.getSnapshot;e=e.value;try{var r=t();return!st(e,r)}catch{return!0}}function Nd(e){var t=It(e,1);t!==null&&it(t,e,1,-1)}function Nu(e){var t=ft();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:$n,lastRenderedState:e},t.queue=e,e=e.dispatch=_m.bind(null,ee,e),[t.memoizedState,e]}function Vn(e,t,r,n){return e={tag:e,create:t,destroy:r,deps:n,next:null},t=ee.updateQueue,t===null?(t={lastEffect:null,stores:null},ee.updateQueue=t,t.lastEffect=e.next=e):(r=t.lastEffect,r===null?t.lastEffect=e.next=e:(n=r.next,r.next=e,e.next=n,t.lastEffect=e)),e}function bd(){return et().memoizedState}function zl(e,t,r,n){var l=ft();ee.flags|=e,l.memoizedState=Vn(1|t,r,void 0,n===void 0?null:n)}function vo(e,t,r,n){var l=et();n=n===void 0?null:n;var o=void 0;if(de!==null){var a=de.memoizedState;if(o=a.destroy,n!==null&&Xi(n,a.deps)){l.memoizedState=Vn(t,r,o,n);return}}ee.flags|=e,l.memoizedState=Vn(1|t,r,o,n)}function bu(e,t){return zl(8390656,8,e,t)}function Ji(e,t){return vo(2048,8,e,t)}function _d(e,t){return vo(4,2,e,t)}function Id(e,t){return vo(4,4,e,t)}function Ld(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function Rd(e,t,r){return r=r!=null?r.concat([e]):null,vo(4,4,Ld.bind(null,t,e),r)}function Zi(){}function Td(e,t){var r=et();t=t===void 0?null:t;var n=r.memoizedState;return n!==null&&t!==null&&Xi(t,n[1])?n[0]:(r.memoizedState=[e,t],e)}function Pd(e,t){var r=et();t=t===void 0?null:t;var n=r.memoizedState;return n!==null&&t!==null&&Xi(t,n[1])?n[0]:(e=e(),r.memoizedState=[e,t],e)}function Fd(e,t,r){return mr&21?(st(r,t)||(r=Bc(),ee.lanes|=r,gr|=r,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,Le=!0),e.memoizedState=r)}function Nm(e,t){var r=G;G=r!==0&&4>r?r:4,e(!0);var n=pa.transition;pa.transition={};try{e(!1),t()}finally{G=r,pa.transition=n}}function zd(){return et().memoizedState}function bm(e,t,r){var n=Kt(e);if(r={lane:n,action:r,hasEagerState:!1,eagerState:null,next:null},Dd(e))Md(t,r);else if(r=hd(e,t,r,n),r!==null){var l=Ce();it(r,e,n,l),Od(r,t,n)}}function _m(e,t,r){var n=Kt(e),l={lane:n,action:r,hasEagerState:!1,eagerState:null,next:null};if(Dd(e))Md(t,l);else{var o=e.alternate;if(e.lanes===0&&(o===null||o.lanes===0)&&(o=t.lastRenderedReducer,o!==null))try{var a=t.lastRenderedState,i=o(a,r);if(l.hasEagerState=!0,l.eagerState=i,st(i,a)){var s=t.interleaved;s===null?(l.next=l,Wi(t)):(l.next=s.next,s.next=l),t.interleaved=l;return}}catch{}finally{}r=hd(e,t,l,n),r!==null&&(l=Ce(),it(r,e,n,l),Od(r,t,n))}}function Dd(e){var t=e.alternate;return e===ee||t!==null&&t===ee}function Md(e,t){Nn=ro=!0;var r=e.pending;r===null?t.next=t:(t.next=r.next,r.next=t),e.pending=t}function Od(e,t,r){if(r&4194240){var n=t.lanes;n&=e.pendingLanes,r|=n,t.lanes=r,Li(e,r)}}var no={readContext:qe,useCallback:xe,useContext:xe,useEffect:xe,useImperativeHandle:xe,useInsertionEffect:xe,useLayoutEffect:xe,useMemo:xe,useReducer:xe,useRef:xe,useState:xe,useDebugValue:xe,useDeferredValue:xe,useTransition:xe,useMutableSource:xe,useSyncExternalStore:xe,useId:xe,unstable_isNewReconciler:!1},Im={readContext:qe,useCallback:function(e,t){return ft().memoizedState=[e,t===void 0?null:t],e},useContext:qe,useEffect:bu,useImperativeHandle:function(e,t,r){return r=r!=null?r.concat([e]):null,zl(4194308,4,Ld.bind(null,t,e),r)},useLayoutEffect:function(e,t){return zl(4194308,4,e,t)},useInsertionEffect:function(e,t){return zl(4,2,e,t)},useMemo:function(e,t){var r=ft();return t=t===void 0?null:t,e=e(),r.memoizedState=[e,t],e},useReducer:function(e,t,r){var n=ft();return t=r!==void 0?r(t):t,n.memoizedState=n.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},n.queue=e,e=e.dispatch=bm.bind(null,ee,e),[n.memoizedState,e]},useRef:function(e){var t=ft();return e={current:e},t.memoizedState=e},useState:Nu,useDebugValue:Zi,useDeferredValue:function(e){return ft().memoizedState=e},useTransition:function(){var e=Nu(!1),t=e[0];return e=Nm.bind(null,e[1]),ft().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,r){var n=ee,l=ft();if(Z){if(r===void 0)throw Error(S(407));r=r()}else{if(r=t(),me===null)throw Error(S(349));mr&30||kd(n,t,r)}l.memoizedState=r;var o={value:r,getSnapshot:t};return l.queue=o,bu(Ed.bind(null,n,o,e),[e]),n.flags|=2048,Vn(9,Sd.bind(null,n,o,r,t),void 0,null),r},useId:function(){var e=ft(),t=me.identifierPrefix;if(Z){var r=Et,n=St;r=(n&~(1<<32-at(n)-1)).toString(32)+r,t=":"+t+"R"+r,r=Wn++,0<r&&(t+="H"+r.toString(32)),t+=":"}else r=Cm++,t=":"+t+"r"+r.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},Lm={readContext:qe,useCallback:Td,useContext:qe,useEffect:Ji,useImperativeHandle:Rd,useInsertionEffect:_d,useLayoutEffect:Id,useMemo:Pd,useReducer:ma,useRef:bd,useState:function(){return ma($n)},useDebugValue:Zi,useDeferredValue:function(e){var t=et();return Fd(t,de.memoizedState,e)},useTransition:function(){var e=ma($n)[0],t=et().memoizedState;return[e,t]},useMutableSource:xd,useSyncExternalStore:wd,useId:zd,unstable_isNewReconciler:!1},Rm={readContext:qe,useCallback:Td,useContext:qe,useEffect:Ji,useImperativeHandle:Rd,useInsertionEffect:_d,useLayoutEffect:Id,useMemo:Pd,useReducer:ga,useRef:bd,useState:function(){return ga($n)},useDebugValue:Zi,useDeferredValue:function(e){var t=et();return de===null?t.memoizedState=e:Fd(t,de.memoizedState,e)},useTransition:function(){var e=ga($n)[0],t=et().memoizedState;return[e,t]},useMutableSource:xd,useSyncExternalStore:wd,useId:zd,unstable_isNewReconciler:!1};function nt(e,t){if(e&&e.defaultProps){t=te({},t),e=e.defaultProps;for(var r in e)t[r]===void 0&&(t[r]=e[r]);return t}return t}function qa(e,t,r,n){t=e.memoizedState,r=r(n,t),r=r==null?t:te({},t,r),e.memoizedState=r,e.lanes===0&&(e.updateQueue.baseState=r)}var yo={isMounted:function(e){return(e=e._reactInternals)?yr(e)===e:!1},enqueueSetState:function(e,t,r){e=e._reactInternals;var n=Ce(),l=Kt(e),o=Nt(n,l);o.payload=t,r!=null&&(o.callback=r),t=Xt(e,o,l),t!==null&&(it(t,e,l,n),Pl(t,e,l))},enqueueReplaceState:function(e,t,r){e=e._reactInternals;var n=Ce(),l=Kt(e),o=Nt(n,l);o.tag=1,o.payload=t,r!=null&&(o.callback=r),t=Xt(e,o,l),t!==null&&(it(t,e,l,n),Pl(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var r=Ce(),n=Kt(e),l=Nt(r,n);l.tag=2,t!=null&&(l.callback=t),t=Xt(e,l,n),t!==null&&(it(t,e,n,r),Pl(t,e,n))}};function _u(e,t,r,n,l,o,a){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(n,o,a):t.prototype&&t.prototype.isPureReactComponent?!On(r,n)||!On(l,o):!0}function Bd(e,t,r){var n=!1,l=qt,o=t.contextType;return typeof o=="object"&&o!==null?o=qe(o):(l=Te(t)?fr:Se.current,n=t.contextTypes,o=(n=n!=null)?Gr(e,l):qt),t=new t(r,o),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=yo,e.stateNode=t,t._reactInternals=e,n&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=o),t}function Iu(e,t,r,n){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(r,n),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(r,n),t.state!==e&&yo.enqueueReplaceState(t,t.state,null)}function ei(e,t,r,n){var l=e.stateNode;l.props=r,l.state=e.memoizedState,l.refs={},$i(e);var o=t.contextType;typeof o=="object"&&o!==null?l.context=qe(o):(o=Te(t)?fr:Se.current,l.context=Gr(e,o)),l.state=e.memoizedState,o=t.getDerivedStateFromProps,typeof o=="function"&&(qa(e,t,o,r),l.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof l.getSnapshotBeforeUpdate=="function"||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(t=l.state,typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount(),t!==l.state&&yo.enqueueReplaceState(l,l.state,null),eo(e,r,l,n),l.state=e.memoizedState),typeof l.componentDidMount=="function"&&(e.flags|=4194308)}function Kr(e,t){try{var r="",n=t;do r+=lp(n),n=n.return;while(n);var l=r}catch(o){l=`
Error generating stack: `+o.message+`
`+o.stack}return{value:e,source:t,stack:l,digest:null}}function ha(e,t,r){return{value:e,source:null,stack:r??null,digest:t??null}}function ti(e,t){try{console.error(t.value)}catch(r){setTimeout(function(){throw r})}}var Tm=typeof WeakMap=="function"?WeakMap:Map;function Ad(e,t,r){r=Nt(-1,r),r.tag=3,r.payload={element:null};var n=t.value;return r.callback=function(){oo||(oo=!0,di=n),ti(e,t)},r}function jd(e,t,r){r=Nt(-1,r),r.tag=3;var n=e.type.getDerivedStateFromError;if(typeof n=="function"){var l=t.value;r.payload=function(){return n(l)},r.callback=function(){ti(e,t)}}var o=e.stateNode;return o!==null&&typeof o.componentDidCatch=="function"&&(r.callback=function(){ti(e,t),typeof n!="function"&&(Qt===null?Qt=new Set([this]):Qt.add(this));var a=t.stack;this.componentDidCatch(t.value,{componentStack:a!==null?a:""})}),r}function Lu(e,t,r){var n=e.pingCache;if(n===null){n=e.pingCache=new Tm;var l=new Set;n.set(t,l)}else l=n.get(t),l===void 0&&(l=new Set,n.set(t,l));l.has(r)||(l.add(r),e=Vm.bind(null,e,t,r),t.then(e,e))}function Ru(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Tu(e,t,r,n,l){return e.mode&1?(e.flags|=65536,e.lanes=l,e):(e===t?e.flags|=65536:(e.flags|=128,r.flags|=131072,r.flags&=-52805,r.tag===1&&(r.alternate===null?r.tag=17:(t=Nt(-1,1),t.tag=2,Xt(r,t,1))),r.lanes|=1),e)}var Pm=Rt.ReactCurrentOwner,Le=!1;function Ee(e,t,r,n){t.child=e===null?gd(t,null,r,n):Xr(t,e.child,r,n)}function Pu(e,t,r,n,l){r=r.render;var o=t.ref;return Wr(t,l),n=Qi(e,t,r,n,o,l),r=Ki(),e!==null&&!Le?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,Lt(e,t,l)):(Z&&r&&Oi(t),t.flags|=1,Ee(e,t,n,l),t.child)}function Fu(e,t,r,n,l){if(e===null){var o=r.type;return typeof o=="function"&&!as(o)&&o.defaultProps===void 0&&r.compare===null&&r.defaultProps===void 0?(t.tag=15,t.type=o,Hd(e,t,o,n,l)):(e=Bl(r.type,null,n,t,t.mode,l),e.ref=t.ref,e.return=t,t.child=e)}if(o=e.child,!(e.lanes&l)){var a=o.memoizedProps;if(r=r.compare,r=r!==null?r:On,r(a,n)&&e.ref===t.ref)return Lt(e,t,l)}return t.flags|=1,e=Jt(o,n),e.ref=t.ref,e.return=t,t.child=e}function Hd(e,t,r,n,l){if(e!==null){var o=e.memoizedProps;if(On(o,n)&&e.ref===t.ref)if(Le=!1,t.pendingProps=n=o,(e.lanes&l)!==0)e.flags&131072&&(Le=!0);else return t.lanes=e.lanes,Lt(e,t,l)}return ri(e,t,r,n,l)}function Ud(e,t,r){var n=t.pendingProps,l=n.children,o=e!==null?e.memoizedState:null;if(n.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},X(Mr,De),De|=r;else{if(!(r&1073741824))return e=o!==null?o.baseLanes|r:r,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,X(Mr,De),De|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},n=o!==null?o.baseLanes:r,X(Mr,De),De|=n}else o!==null?(n=o.baseLanes|r,t.memoizedState=null):n=r,X(Mr,De),De|=n;return Ee(e,t,l,r),t.child}function Wd(e,t){var r=t.ref;(e===null&&r!==null||e!==null&&e.ref!==r)&&(t.flags|=512,t.flags|=2097152)}function ri(e,t,r,n,l){var o=Te(r)?fr:Se.current;return o=Gr(t,o),Wr(t,l),r=Qi(e,t,r,n,o,l),n=Ki(),e!==null&&!Le?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,Lt(e,t,l)):(Z&&n&&Oi(t),t.flags|=1,Ee(e,t,r,l),t.child)}function zu(e,t,r,n,l){if(Te(r)){var o=!0;Ql(t)}else o=!1;if(Wr(t,l),t.stateNode===null)Dl(e,t),Bd(t,r,n),ei(t,r,n,l),n=!0;else if(e===null){var a=t.stateNode,i=t.memoizedProps;a.props=i;var s=a.context,c=r.contextType;typeof c=="object"&&c!==null?c=qe(c):(c=Te(r)?fr:Se.current,c=Gr(t,c));var h=r.getDerivedStateFromProps,v=typeof h=="function"||typeof a.getSnapshotBeforeUpdate=="function";v||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(i!==n||s!==c)&&Iu(t,a,n,c),Bt=!1;var g=t.memoizedState;a.state=g,eo(t,n,a,l),s=t.memoizedState,i!==n||g!==s||Re.current||Bt?(typeof h=="function"&&(qa(t,r,h,n),s=t.memoizedState),(i=Bt||_u(t,r,i,n,g,s,c))?(v||typeof a.UNSAFE_componentWillMount!="function"&&typeof a.componentWillMount!="function"||(typeof a.componentWillMount=="function"&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount=="function"&&a.UNSAFE_componentWillMount()),typeof a.componentDidMount=="function"&&(t.flags|=4194308)):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=n,t.memoizedState=s),a.props=n,a.state=s,a.context=c,n=i):(typeof a.componentDidMount=="function"&&(t.flags|=4194308),n=!1)}else{a=t.stateNode,vd(e,t),i=t.memoizedProps,c=t.type===t.elementType?i:nt(t.type,i),a.props=c,v=t.pendingProps,g=a.context,s=r.contextType,typeof s=="object"&&s!==null?s=qe(s):(s=Te(r)?fr:Se.current,s=Gr(t,s));var w=r.getDerivedStateFromProps;(h=typeof w=="function"||typeof a.getSnapshotBeforeUpdate=="function")||typeof a.UNSAFE_componentWillReceiveProps!="function"&&typeof a.componentWillReceiveProps!="function"||(i!==v||g!==s)&&Iu(t,a,n,s),Bt=!1,g=t.memoizedState,a.state=g,eo(t,n,a,l);var E=t.memoizedState;i!==v||g!==E||Re.current||Bt?(typeof w=="function"&&(qa(t,r,w,n),E=t.memoizedState),(c=Bt||_u(t,r,c,n,g,E,s)||!1)?(h||typeof a.UNSAFE_componentWillUpdate!="function"&&typeof a.componentWillUpdate!="function"||(typeof a.componentWillUpdate=="function"&&a.componentWillUpdate(n,E,s),typeof a.UNSAFE_componentWillUpdate=="function"&&a.UNSAFE_componentWillUpdate(n,E,s)),typeof a.componentDidUpdate=="function"&&(t.flags|=4),typeof a.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof a.componentDidUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=1024),t.memoizedProps=n,t.memoizedState=E),a.props=n,a.state=E,a.context=s,n=c):(typeof a.componentDidUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!="function"||i===e.memoizedProps&&g===e.memoizedState||(t.flags|=1024),n=!1)}return ni(e,t,r,n,o,l)}function ni(e,t,r,n,l,o){Wd(e,t);var a=(t.flags&128)!==0;if(!n&&!a)return l&&xu(t,r,!1),Lt(e,t,o);n=t.stateNode,Pm.current=t;var i=a&&typeof r.getDerivedStateFromError!="function"?null:n.render();return t.flags|=1,e!==null&&a?(t.child=Xr(t,e.child,null,o),t.child=Xr(t,null,i,o)):Ee(e,t,i,o),t.memoizedState=n.state,l&&xu(t,r,!0),t.child}function $d(e){var t=e.stateNode;t.pendingContext?yu(e,t.pendingContext,t.pendingContext!==t.context):t.context&&yu(e,t.context,!1),Vi(e,t.containerInfo)}function Du(e,t,r,n,l){return Yr(),Ai(l),t.flags|=256,Ee(e,t,r,n),t.child}var li={dehydrated:null,treeContext:null,retryLane:0};function oi(e){return{baseLanes:e,cachePool:null,transitions:null}}function Vd(e,t,r){var n=t.pendingProps,l=q.current,o=!1,a=(t.flags&128)!==0,i;if((i=a)||(i=e!==null&&e.memoizedState===null?!1:(l&2)!==0),i?(o=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(l|=1),X(q,l&1),e===null)return Ja(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(a=n.children,e=n.fallback,o?(n=t.mode,o=t.child,a={mode:"hidden",children:a},!(n&1)&&o!==null?(o.childLanes=0,o.pendingProps=a):o=ko(a,n,0,null),e=cr(e,n,r,null),o.return=t,e.return=t,o.sibling=e,t.child=o,t.child.memoizedState=oi(r),t.memoizedState=li,e):qi(t,a));if(l=e.memoizedState,l!==null&&(i=l.dehydrated,i!==null))return Fm(e,t,a,n,i,l,r);if(o){o=n.fallback,a=t.mode,l=e.child,i=l.sibling;var s={mode:"hidden",children:n.children};return!(a&1)&&t.child!==l?(n=t.child,n.childLanes=0,n.pendingProps=s,t.deletions=null):(n=Jt(l,s),n.subtreeFlags=l.subtreeFlags&14680064),i!==null?o=Jt(i,o):(o=cr(o,a,r,null),o.flags|=2),o.return=t,n.return=t,n.sibling=o,t.child=n,n=o,o=t.child,a=e.child.memoizedState,a=a===null?oi(r):{baseLanes:a.baseLanes|r,cachePool:null,transitions:a.transitions},o.memoizedState=a,o.childLanes=e.childLanes&~r,t.memoizedState=li,n}return o=e.child,e=o.sibling,n=Jt(o,{mode:"visible",children:n.children}),!(t.mode&1)&&(n.lanes=r),n.return=t,n.sibling=null,e!==null&&(r=t.deletions,r===null?(t.deletions=[e],t.flags|=16):r.push(e)),t.child=n,t.memoizedState=null,n}function qi(e,t){return t=ko({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function El(e,t,r,n){return n!==null&&Ai(n),Xr(t,e.child,null,r),e=qi(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Fm(e,t,r,n,l,o,a){if(r)return t.flags&256?(t.flags&=-257,n=ha(Error(S(422))),El(e,t,a,n)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(o=n.fallback,l=t.mode,n=ko({mode:"visible",children:n.children},l,0,null),o=cr(o,l,a,null),o.flags|=2,n.return=t,o.return=t,n.sibling=o,t.child=n,t.mode&1&&Xr(t,e.child,null,a),t.child.memoizedState=oi(a),t.memoizedState=li,o);if(!(t.mode&1))return El(e,t,a,null);if(l.data==="$!"){if(n=l.nextSibling&&l.nextSibling.dataset,n)var i=n.dgst;return n=i,o=Error(S(419)),n=ha(o,n,void 0),El(e,t,a,n)}if(i=(a&e.childLanes)!==0,Le||i){if(n=me,n!==null){switch(a&-a){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=l&(n.suspendedLanes|a)?0:l,l!==0&&l!==o.retryLane&&(o.retryLane=l,It(e,l),it(n,e,l,-1))}return os(),n=ha(Error(S(421))),El(e,t,a,n)}return l.data==="$?"?(t.flags|=128,t.child=e.child,t=Gm.bind(null,e),l._reactRetry=t,null):(e=o.treeContext,Oe=Yt(l.nextSibling),Be=t,Z=!0,ot=null,e!==null&&(Qe[Ke++]=St,Qe[Ke++]=Et,Qe[Ke++]=pr,St=e.id,Et=e.overflow,pr=t),t=qi(t,n.children),t.flags|=4096,t)}function Mu(e,t,r){e.lanes|=t;var n=e.alternate;n!==null&&(n.lanes|=t),Za(e.return,t,r)}function va(e,t,r,n,l){var o=e.memoizedState;o===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:n,tail:r,tailMode:l}:(o.isBackwards=t,o.rendering=null,o.renderingStartTime=0,o.last=n,o.tail=r,o.tailMode=l)}function Gd(e,t,r){var n=t.pendingProps,l=n.revealOrder,o=n.tail;if(Ee(e,t,n.children,r),n=q.current,n&2)n=n&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Mu(e,r,t);else if(e.tag===19)Mu(e,r,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}n&=1}if(X(q,n),!(t.mode&1))t.memoizedState=null;else switch(l){case"forwards":for(r=t.child,l=null;r!==null;)e=r.alternate,e!==null&&to(e)===null&&(l=r),r=r.sibling;r=l,r===null?(l=t.child,t.child=null):(l=r.sibling,r.sibling=null),va(t,!1,l,r,o);break;case"backwards":for(r=null,l=t.child,t.child=null;l!==null;){if(e=l.alternate,e!==null&&to(e)===null){t.child=l;break}e=l.sibling,l.sibling=r,r=l,l=e}va(t,!0,r,null,o);break;case"together":va(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function Dl(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Lt(e,t,r){if(e!==null&&(t.dependencies=e.dependencies),gr|=t.lanes,!(r&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(S(153));if(t.child!==null){for(e=t.child,r=Jt(e,e.pendingProps),t.child=r,r.return=t;e.sibling!==null;)e=e.sibling,r=r.sibling=Jt(e,e.pendingProps),r.return=t;r.sibling=null}return t.child}function zm(e,t,r){switch(t.tag){case 3:$d(t),Yr();break;case 5:yd(t);break;case 1:Te(t.type)&&Ql(t);break;case 4:Vi(t,t.stateNode.containerInfo);break;case 10:var n=t.type._context,l=t.memoizedProps.value;X(Zl,n._currentValue),n._currentValue=l;break;case 13:if(n=t.memoizedState,n!==null)return n.dehydrated!==null?(X(q,q.current&1),t.flags|=128,null):r&t.child.childLanes?Vd(e,t,r):(X(q,q.current&1),e=Lt(e,t,r),e!==null?e.sibling:null);X(q,q.current&1);break;case 19:if(n=(r&t.childLanes)!==0,e.flags&128){if(n)return Gd(e,t,r);t.flags|=128}if(l=t.memoizedState,l!==null&&(l.rendering=null,l.tail=null,l.lastEffect=null),X(q,q.current),n)break;return null;case 22:case 23:return t.lanes=0,Ud(e,t,r)}return Lt(e,t,r)}var Yd,ai,Xd,Qd;Yd=function(e,t){for(var r=t.child;r!==null;){if(r.tag===5||r.tag===6)e.appendChild(r.stateNode);else if(r.tag!==4&&r.child!==null){r.child.return=r,r=r.child;continue}if(r===t)break;for(;r.sibling===null;){if(r.return===null||r.return===t)return;r=r.return}r.sibling.return=r.return,r=r.sibling}};ai=function(){};Xd=function(e,t,r,n){var l=e.memoizedProps;if(l!==n){e=t.stateNode,sr(gt.current);var o=null;switch(r){case"input":l=Ia(e,l),n=Ia(e,n),o=[];break;case"select":l=te({},l,{value:void 0}),n=te({},n,{value:void 0}),o=[];break;case"textarea":l=Ta(e,l),n=Ta(e,n),o=[];break;default:typeof l.onClick!="function"&&typeof n.onClick=="function"&&(e.onclick=Yl)}Fa(r,n);var a;r=null;for(c in l)if(!n.hasOwnProperty(c)&&l.hasOwnProperty(c)&&l[c]!=null)if(c==="style"){var i=l[c];for(a in i)i.hasOwnProperty(a)&&(r||(r={}),r[a]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Rn.hasOwnProperty(c)?o||(o=[]):(o=o||[]).push(c,null));for(c in n){var s=n[c];if(i=l!=null?l[c]:void 0,n.hasOwnProperty(c)&&s!==i&&(s!=null||i!=null))if(c==="style")if(i){for(a in i)!i.hasOwnProperty(a)||s&&s.hasOwnProperty(a)||(r||(r={}),r[a]="");for(a in s)s.hasOwnProperty(a)&&i[a]!==s[a]&&(r||(r={}),r[a]=s[a])}else r||(o||(o=[]),o.push(c,r)),r=s;else c==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,i=i?i.__html:void 0,s!=null&&i!==s&&(o=o||[]).push(c,s)):c==="children"?typeof s!="string"&&typeof s!="number"||(o=o||[]).push(c,""+s):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Rn.hasOwnProperty(c)?(s!=null&&c==="onScroll"&&Q("scroll",e),o||i===s||(o=[])):(o=o||[]).push(c,s))}r&&(o=o||[]).push("style",r);var c=o;(t.updateQueue=c)&&(t.flags|=4)}};Qd=function(e,t,r,n){r!==n&&(t.flags|=4)};function fn(e,t){if(!Z)switch(e.tailMode){case"hidden":t=e.tail;for(var r=null;t!==null;)t.alternate!==null&&(r=t),t=t.sibling;r===null?e.tail=null:r.sibling=null;break;case"collapsed":r=e.tail;for(var n=null;r!==null;)r.alternate!==null&&(n=r),r=r.sibling;n===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:n.sibling=null}}function we(e){var t=e.alternate!==null&&e.alternate.child===e.child,r=0,n=0;if(t)for(var l=e.child;l!==null;)r|=l.lanes|l.childLanes,n|=l.subtreeFlags&14680064,n|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;l!==null;)r|=l.lanes|l.childLanes,n|=l.subtreeFlags,n|=l.flags,l.return=e,l=l.sibling;return e.subtreeFlags|=n,e.childLanes=r,t}function Dm(e,t,r){var n=t.pendingProps;switch(Bi(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return we(t),null;case 1:return Te(t.type)&&Xl(),we(t),null;case 3:return n=t.stateNode,Qr(),K(Re),K(Se),Yi(),n.pendingContext&&(n.context=n.pendingContext,n.pendingContext=null),(e===null||e.child===null)&&(kl(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,ot!==null&&(mi(ot),ot=null))),ai(e,t),we(t),null;case 5:Gi(t);var l=sr(Un.current);if(r=t.type,e!==null&&t.stateNode!=null)Xd(e,t,r,n,l),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!n){if(t.stateNode===null)throw Error(S(166));return we(t),null}if(e=sr(gt.current),kl(t)){n=t.stateNode,r=t.type;var o=t.memoizedProps;switch(n[pt]=t,n[jn]=o,e=(t.mode&1)!==0,r){case"dialog":Q("cancel",n),Q("close",n);break;case"iframe":case"object":case"embed":Q("load",n);break;case"video":case"audio":for(l=0;l<xn.length;l++)Q(xn[l],n);break;case"source":Q("error",n);break;case"img":case"image":case"link":Q("error",n),Q("load",n);break;case"details":Q("toggle",n);break;case"input":Vs(n,o),Q("invalid",n);break;case"select":n._wrapperState={wasMultiple:!!o.multiple},Q("invalid",n);break;case"textarea":Ys(n,o),Q("invalid",n)}Fa(r,o),l=null;for(var a in o)if(o.hasOwnProperty(a)){var i=o[a];a==="children"?typeof i=="string"?n.textContent!==i&&(o.suppressHydrationWarning!==!0&&wl(n.textContent,i,e),l=["children",i]):typeof i=="number"&&n.textContent!==""+i&&(o.suppressHydrationWarning!==!0&&wl(n.textContent,i,e),l=["children",""+i]):Rn.hasOwnProperty(a)&&i!=null&&a==="onScroll"&&Q("scroll",n)}switch(r){case"input":fl(n),Gs(n,o,!0);break;case"textarea":fl(n),Xs(n);break;case"select":case"option":break;default:typeof o.onClick=="function"&&(n.onclick=Yl)}n=l,t.updateQueue=n,n!==null&&(t.flags|=4)}else{a=l.nodeType===9?l:l.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=Ec(r)),e==="http://www.w3.org/1999/xhtml"?r==="script"?(e=a.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof n.is=="string"?e=a.createElement(r,{is:n.is}):(e=a.createElement(r),r==="select"&&(a=e,n.multiple?a.multiple=!0:n.size&&(a.size=n.size))):e=a.createElementNS(e,r),e[pt]=t,e[jn]=n,Yd(e,t,!1,!1),t.stateNode=e;e:{switch(a=za(r,n),r){case"dialog":Q("cancel",e),Q("close",e),l=n;break;case"iframe":case"object":case"embed":Q("load",e),l=n;break;case"video":case"audio":for(l=0;l<xn.length;l++)Q(xn[l],e);l=n;break;case"source":Q("error",e),l=n;break;case"img":case"image":case"link":Q("error",e),Q("load",e),l=n;break;case"details":Q("toggle",e),l=n;break;case"input":Vs(e,n),l=Ia(e,n),Q("invalid",e);break;case"option":l=n;break;case"select":e._wrapperState={wasMultiple:!!n.multiple},l=te({},n,{value:void 0}),Q("invalid",e);break;case"textarea":Ys(e,n),l=Ta(e,n),Q("invalid",e);break;default:l=n}Fa(r,l),i=l;for(o in i)if(i.hasOwnProperty(o)){var s=i[o];o==="style"?bc(e,s):o==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,s!=null&&Cc(e,s)):o==="children"?typeof s=="string"?(r!=="textarea"||s!=="")&&Tn(e,s):typeof s=="number"&&Tn(e,""+s):o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&o!=="autoFocus"&&(Rn.hasOwnProperty(o)?s!=null&&o==="onScroll"&&Q("scroll",e):s!=null&&Ei(e,o,s,a))}switch(r){case"input":fl(e),Gs(e,n,!1);break;case"textarea":fl(e),Xs(e);break;case"option":n.value!=null&&e.setAttribute("value",""+Zt(n.value));break;case"select":e.multiple=!!n.multiple,o=n.value,o!=null?Ar(e,!!n.multiple,o,!1):n.defaultValue!=null&&Ar(e,!!n.multiple,n.defaultValue,!0);break;default:typeof l.onClick=="function"&&(e.onclick=Yl)}switch(r){case"button":case"input":case"select":case"textarea":n=!!n.autoFocus;break e;case"img":n=!0;break e;default:n=!1}}n&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return we(t),null;case 6:if(e&&t.stateNode!=null)Qd(e,t,e.memoizedProps,n);else{if(typeof n!="string"&&t.stateNode===null)throw Error(S(166));if(r=sr(Un.current),sr(gt.current),kl(t)){if(n=t.stateNode,r=t.memoizedProps,n[pt]=t,(o=n.nodeValue!==r)&&(e=Be,e!==null))switch(e.tag){case 3:wl(n.nodeValue,r,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&wl(n.nodeValue,r,(e.mode&1)!==0)}o&&(t.flags|=4)}else n=(r.nodeType===9?r:r.ownerDocument).createTextNode(n),n[pt]=t,t.stateNode=n}return we(t),null;case 13:if(K(q),n=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Z&&Oe!==null&&t.mode&1&&!(t.flags&128))pd(),Yr(),t.flags|=98560,o=!1;else if(o=kl(t),n!==null&&n.dehydrated!==null){if(e===null){if(!o)throw Error(S(318));if(o=t.memoizedState,o=o!==null?o.dehydrated:null,!o)throw Error(S(317));o[pt]=t}else Yr(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;we(t),o=!1}else ot!==null&&(mi(ot),ot=null),o=!0;if(!o)return t.flags&65536?t:null}return t.flags&128?(t.lanes=r,t):(n=n!==null,n!==(e!==null&&e.memoizedState!==null)&&n&&(t.child.flags|=8192,t.mode&1&&(e===null||q.current&1?fe===0&&(fe=3):os())),t.updateQueue!==null&&(t.flags|=4),we(t),null);case 4:return Qr(),ai(e,t),e===null&&Bn(t.stateNode.containerInfo),we(t),null;case 10:return Ui(t.type._context),we(t),null;case 17:return Te(t.type)&&Xl(),we(t),null;case 19:if(K(q),o=t.memoizedState,o===null)return we(t),null;if(n=(t.flags&128)!==0,a=o.rendering,a===null)if(n)fn(o,!1);else{if(fe!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(a=to(e),a!==null){for(t.flags|=128,fn(o,!1),n=a.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),t.subtreeFlags=0,n=r,r=t.child;r!==null;)o=r,e=n,o.flags&=14680066,a=o.alternate,a===null?(o.childLanes=0,o.lanes=e,o.child=null,o.subtreeFlags=0,o.memoizedProps=null,o.memoizedState=null,o.updateQueue=null,o.dependencies=null,o.stateNode=null):(o.childLanes=a.childLanes,o.lanes=a.lanes,o.child=a.child,o.subtreeFlags=0,o.deletions=null,o.memoizedProps=a.memoizedProps,o.memoizedState=a.memoizedState,o.updateQueue=a.updateQueue,o.type=a.type,e=a.dependencies,o.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),r=r.sibling;return X(q,q.current&1|2),t.child}e=e.sibling}o.tail!==null&&ie()>Jr&&(t.flags|=128,n=!0,fn(o,!1),t.lanes=4194304)}else{if(!n)if(e=to(a),e!==null){if(t.flags|=128,n=!0,r=e.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),fn(o,!0),o.tail===null&&o.tailMode==="hidden"&&!a.alternate&&!Z)return we(t),null}else 2*ie()-o.renderingStartTime>Jr&&r!==1073741824&&(t.flags|=128,n=!0,fn(o,!1),t.lanes=4194304);o.isBackwards?(a.sibling=t.child,t.child=a):(r=o.last,r!==null?r.sibling=a:t.child=a,o.last=a)}return o.tail!==null?(t=o.tail,o.rendering=t,o.tail=t.sibling,o.renderingStartTime=ie(),t.sibling=null,r=q.current,X(q,n?r&1|2:r&1),t):(we(t),null);case 22:case 23:return ls(),n=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==n&&(t.flags|=8192),n&&t.mode&1?De&1073741824&&(we(t),t.subtreeFlags&6&&(t.flags|=8192)):we(t),null;case 24:return null;case 25:return null}throw Error(S(156,t.tag))}function Mm(e,t){switch(Bi(t),t.tag){case 1:return Te(t.type)&&Xl(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Qr(),K(Re),K(Se),Yi(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return Gi(t),null;case 13:if(K(q),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(S(340));Yr()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return K(q),null;case 4:return Qr(),null;case 10:return Ui(t.type._context),null;case 22:case 23:return ls(),null;case 24:return null;default:return null}}var Cl=!1,ke=!1,Om=typeof WeakSet=="function"?WeakSet:Set,I=null;function Dr(e,t){var r=e.ref;if(r!==null)if(typeof r=="function")try{r(null)}catch(n){le(e,t,n)}else r.current=null}function ii(e,t,r){try{r()}catch(n){le(e,t,n)}}var Ou=!1;function Bm(e,t){if($a=$l,e=ed(),Mi(e)){if("selectionStart"in e)var r={start:e.selectionStart,end:e.selectionEnd};else e:{r=(r=e.ownerDocument)&&r.defaultView||window;var n=r.getSelection&&r.getSelection();if(n&&n.rangeCount!==0){r=n.anchorNode;var l=n.anchorOffset,o=n.focusNode;n=n.focusOffset;try{r.nodeType,o.nodeType}catch{r=null;break e}var a=0,i=-1,s=-1,c=0,h=0,v=e,g=null;t:for(;;){for(var w;v!==r||l!==0&&v.nodeType!==3||(i=a+l),v!==o||n!==0&&v.nodeType!==3||(s=a+n),v.nodeType===3&&(a+=v.nodeValue.length),(w=v.firstChild)!==null;)g=v,v=w;for(;;){if(v===e)break t;if(g===r&&++c===l&&(i=a),g===o&&++h===n&&(s=a),(w=v.nextSibling)!==null)break;v=g,g=v.parentNode}v=w}r=i===-1||s===-1?null:{start:i,end:s}}else r=null}r=r||{start:0,end:0}}else r=null;for(Va={focusedElem:e,selectionRange:r},$l=!1,I=t;I!==null;)if(t=I,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,I=e;else for(;I!==null;){t=I;try{var E=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(E!==null){var x=E.memoizedProps,W=E.memoizedState,f=t.stateNode,d=f.getSnapshotBeforeUpdate(t.elementType===t.type?x:nt(t.type,x),W);f.__reactInternalSnapshotBeforeUpdate=d}break;case 3:var m=t.stateNode.containerInfo;m.nodeType===1?m.textContent="":m.nodeType===9&&m.documentElement&&m.removeChild(m.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(S(163))}}catch(k){le(t,t.return,k)}if(e=t.sibling,e!==null){e.return=t.return,I=e;break}I=t.return}return E=Ou,Ou=!1,E}function bn(e,t,r){var n=t.updateQueue;if(n=n!==null?n.lastEffect:null,n!==null){var l=n=n.next;do{if((l.tag&e)===e){var o=l.destroy;l.destroy=void 0,o!==void 0&&ii(t,r,o)}l=l.next}while(l!==n)}}function xo(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var r=t=t.next;do{if((r.tag&e)===e){var n=r.create;r.destroy=n()}r=r.next}while(r!==t)}}function si(e){var t=e.ref;if(t!==null){var r=e.stateNode;switch(e.tag){case 5:e=r;break;default:e=r}typeof t=="function"?t(e):t.current=e}}function Kd(e){var t=e.alternate;t!==null&&(e.alternate=null,Kd(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[pt],delete t[jn],delete t[Xa],delete t[wm],delete t[km])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function Jd(e){return e.tag===5||e.tag===3||e.tag===4}function Bu(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||Jd(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function ui(e,t,r){var n=e.tag;if(n===5||n===6)e=e.stateNode,t?r.nodeType===8?r.parentNode.insertBefore(e,t):r.insertBefore(e,t):(r.nodeType===8?(t=r.parentNode,t.insertBefore(e,r)):(t=r,t.appendChild(e)),r=r._reactRootContainer,r!=null||t.onclick!==null||(t.onclick=Yl));else if(n!==4&&(e=e.child,e!==null))for(ui(e,t,r),e=e.sibling;e!==null;)ui(e,t,r),e=e.sibling}function ci(e,t,r){var n=e.tag;if(n===5||n===6)e=e.stateNode,t?r.insertBefore(e,t):r.appendChild(e);else if(n!==4&&(e=e.child,e!==null))for(ci(e,t,r),e=e.sibling;e!==null;)ci(e,t,r),e=e.sibling}var he=null,lt=!1;function Mt(e,t,r){for(r=r.child;r!==null;)Zd(e,t,r),r=r.sibling}function Zd(e,t,r){if(mt&&typeof mt.onCommitFiberUnmount=="function")try{mt.onCommitFiberUnmount(co,r)}catch{}switch(r.tag){case 5:ke||Dr(r,t);case 6:var n=he,l=lt;he=null,Mt(e,t,r),he=n,lt=l,he!==null&&(lt?(e=he,r=r.stateNode,e.nodeType===8?e.parentNode.removeChild(r):e.removeChild(r)):he.removeChild(r.stateNode));break;case 18:he!==null&&(lt?(e=he,r=r.stateNode,e.nodeType===8?ca(e.parentNode,r):e.nodeType===1&&ca(e,r),Dn(e)):ca(he,r.stateNode));break;case 4:n=he,l=lt,he=r.stateNode.containerInfo,lt=!0,Mt(e,t,r),he=n,lt=l;break;case 0:case 11:case 14:case 15:if(!ke&&(n=r.updateQueue,n!==null&&(n=n.lastEffect,n!==null))){l=n=n.next;do{var o=l,a=o.destroy;o=o.tag,a!==void 0&&(o&2||o&4)&&ii(r,t,a),l=l.next}while(l!==n)}Mt(e,t,r);break;case 1:if(!ke&&(Dr(r,t),n=r.stateNode,typeof n.componentWillUnmount=="function"))try{n.props=r.memoizedProps,n.state=r.memoizedState,n.componentWillUnmount()}catch(i){le(r,t,i)}Mt(e,t,r);break;case 21:Mt(e,t,r);break;case 22:r.mode&1?(ke=(n=ke)||r.memoizedState!==null,Mt(e,t,r),ke=n):Mt(e,t,r);break;default:Mt(e,t,r)}}function Au(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var r=e.stateNode;r===null&&(r=e.stateNode=new Om),t.forEach(function(n){var l=Ym.bind(null,e,n);r.has(n)||(r.add(n),n.then(l,l))})}}function rt(e,t){var r=t.deletions;if(r!==null)for(var n=0;n<r.length;n++){var l=r[n];try{var o=e,a=t,i=a;e:for(;i!==null;){switch(i.tag){case 5:he=i.stateNode,lt=!1;break e;case 3:he=i.stateNode.containerInfo,lt=!0;break e;case 4:he=i.stateNode.containerInfo,lt=!0;break e}i=i.return}if(he===null)throw Error(S(160));Zd(o,a,l),he=null,lt=!1;var s=l.alternate;s!==null&&(s.return=null),l.return=null}catch(c){le(l,t,c)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)qd(t,e),t=t.sibling}function qd(e,t){var r=e.alternate,n=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(rt(t,e),ct(e),n&4){try{bn(3,e,e.return),xo(3,e)}catch(x){le(e,e.return,x)}try{bn(5,e,e.return)}catch(x){le(e,e.return,x)}}break;case 1:rt(t,e),ct(e),n&512&&r!==null&&Dr(r,r.return);break;case 5:if(rt(t,e),ct(e),n&512&&r!==null&&Dr(r,r.return),e.flags&32){var l=e.stateNode;try{Tn(l,"")}catch(x){le(e,e.return,x)}}if(n&4&&(l=e.stateNode,l!=null)){var o=e.memoizedProps,a=r!==null?r.memoizedProps:o,i=e.type,s=e.updateQueue;if(e.updateQueue=null,s!==null)try{i==="input"&&o.type==="radio"&&o.name!=null&&kc(l,o),za(i,a);var c=za(i,o);for(a=0;a<s.length;a+=2){var h=s[a],v=s[a+1];h==="style"?bc(l,v):h==="dangerouslySetInnerHTML"?Cc(l,v):h==="children"?Tn(l,v):Ei(l,h,v,c)}switch(i){case"input":La(l,o);break;case"textarea":Sc(l,o);break;case"select":var g=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!o.multiple;var w=o.value;w!=null?Ar(l,!!o.multiple,w,!1):g!==!!o.multiple&&(o.defaultValue!=null?Ar(l,!!o.multiple,o.defaultValue,!0):Ar(l,!!o.multiple,o.multiple?[]:"",!1))}l[jn]=o}catch(x){le(e,e.return,x)}}break;case 6:if(rt(t,e),ct(e),n&4){if(e.stateNode===null)throw Error(S(162));l=e.stateNode,o=e.memoizedProps;try{l.nodeValue=o}catch(x){le(e,e.return,x)}}break;case 3:if(rt(t,e),ct(e),n&4&&r!==null&&r.memoizedState.isDehydrated)try{Dn(t.containerInfo)}catch(x){le(e,e.return,x)}break;case 4:rt(t,e),ct(e);break;case 13:rt(t,e),ct(e),l=e.child,l.flags&8192&&(o=l.memoizedState!==null,l.stateNode.isHidden=o,!o||l.alternate!==null&&l.alternate.memoizedState!==null||(rs=ie())),n&4&&Au(e);break;case 22:if(h=r!==null&&r.memoizedState!==null,e.mode&1?(ke=(c=ke)||h,rt(t,e),ke=c):rt(t,e),ct(e),n&8192){if(c=e.memoizedState!==null,(e.stateNode.isHidden=c)&&!h&&e.mode&1)for(I=e,h=e.child;h!==null;){for(v=I=h;I!==null;){switch(g=I,w=g.child,g.tag){case 0:case 11:case 14:case 15:bn(4,g,g.return);break;case 1:Dr(g,g.return);var E=g.stateNode;if(typeof E.componentWillUnmount=="function"){n=g,r=g.return;try{t=n,E.props=t.memoizedProps,E.state=t.memoizedState,E.componentWillUnmount()}catch(x){le(n,r,x)}}break;case 5:Dr(g,g.return);break;case 22:if(g.memoizedState!==null){Hu(v);continue}}w!==null?(w.return=g,I=w):Hu(v)}h=h.sibling}e:for(h=null,v=e;;){if(v.tag===5){if(h===null){h=v;try{l=v.stateNode,c?(o=l.style,typeof o.setProperty=="function"?o.setProperty("display","none","important"):o.display="none"):(i=v.stateNode,s=v.memoizedProps.style,a=s!=null&&s.hasOwnProperty("display")?s.display:null,i.style.display=Nc("display",a))}catch(x){le(e,e.return,x)}}}else if(v.tag===6){if(h===null)try{v.stateNode.nodeValue=c?"":v.memoizedProps}catch(x){le(e,e.return,x)}}else if((v.tag!==22&&v.tag!==23||v.memoizedState===null||v===e)&&v.child!==null){v.child.return=v,v=v.child;continue}if(v===e)break e;for(;v.sibling===null;){if(v.return===null||v.return===e)break e;h===v&&(h=null),v=v.return}h===v&&(h=null),v.sibling.return=v.return,v=v.sibling}}break;case 19:rt(t,e),ct(e),n&4&&Au(e);break;case 21:break;default:rt(t,e),ct(e)}}function ct(e){var t=e.flags;if(t&2){try{e:{for(var r=e.return;r!==null;){if(Jd(r)){var n=r;break e}r=r.return}throw Error(S(160))}switch(n.tag){case 5:var l=n.stateNode;n.flags&32&&(Tn(l,""),n.flags&=-33);var o=Bu(e);ci(e,o,l);break;case 3:case 4:var a=n.stateNode.containerInfo,i=Bu(e);ui(e,i,a);break;default:throw Error(S(161))}}catch(s){le(e,e.return,s)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function Am(e,t,r){I=e,ef(e)}function ef(e,t,r){for(var n=(e.mode&1)!==0;I!==null;){var l=I,o=l.child;if(l.tag===22&&n){var a=l.memoizedState!==null||Cl;if(!a){var i=l.alternate,s=i!==null&&i.memoizedState!==null||ke;i=Cl;var c=ke;if(Cl=a,(ke=s)&&!c)for(I=l;I!==null;)a=I,s=a.child,a.tag===22&&a.memoizedState!==null?Uu(l):s!==null?(s.return=a,I=s):Uu(l);for(;o!==null;)I=o,ef(o),o=o.sibling;I=l,Cl=i,ke=c}ju(e)}else l.subtreeFlags&8772&&o!==null?(o.return=l,I=o):ju(e)}}function ju(e){for(;I!==null;){var t=I;if(t.flags&8772){var r=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:ke||xo(5,t);break;case 1:var n=t.stateNode;if(t.flags&4&&!ke)if(r===null)n.componentDidMount();else{var l=t.elementType===t.type?r.memoizedProps:nt(t.type,r.memoizedProps);n.componentDidUpdate(l,r.memoizedState,n.__reactInternalSnapshotBeforeUpdate)}var o=t.updateQueue;o!==null&&Cu(t,o,n);break;case 3:var a=t.updateQueue;if(a!==null){if(r=null,t.child!==null)switch(t.child.tag){case 5:r=t.child.stateNode;break;case 1:r=t.child.stateNode}Cu(t,a,r)}break;case 5:var i=t.stateNode;if(r===null&&t.flags&4){r=i;var s=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":s.autoFocus&&r.focus();break;case"img":s.src&&(r.src=s.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var c=t.alternate;if(c!==null){var h=c.memoizedState;if(h!==null){var v=h.dehydrated;v!==null&&Dn(v)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(S(163))}ke||t.flags&512&&si(t)}catch(g){le(t,t.return,g)}}if(t===e){I=null;break}if(r=t.sibling,r!==null){r.return=t.return,I=r;break}I=t.return}}function Hu(e){for(;I!==null;){var t=I;if(t===e){I=null;break}var r=t.sibling;if(r!==null){r.return=t.return,I=r;break}I=t.return}}function Uu(e){for(;I!==null;){var t=I;try{switch(t.tag){case 0:case 11:case 15:var r=t.return;try{xo(4,t)}catch(s){le(t,r,s)}break;case 1:var n=t.stateNode;if(typeof n.componentDidMount=="function"){var l=t.return;try{n.componentDidMount()}catch(s){le(t,l,s)}}var o=t.return;try{si(t)}catch(s){le(t,o,s)}break;case 5:var a=t.return;try{si(t)}catch(s){le(t,a,s)}}}catch(s){le(t,t.return,s)}if(t===e){I=null;break}var i=t.sibling;if(i!==null){i.return=t.return,I=i;break}I=t.return}}var jm=Math.ceil,lo=Rt.ReactCurrentDispatcher,es=Rt.ReactCurrentOwner,Ze=Rt.ReactCurrentBatchConfig,$=0,me=null,ce=null,ve=0,De=0,Mr=tr(0),fe=0,Gn=null,gr=0,wo=0,ts=0,_n=null,Ie=null,rs=0,Jr=1/0,wt=null,oo=!1,di=null,Qt=null,Nl=!1,Wt=null,ao=0,In=0,fi=null,Ml=-1,Ol=0;function Ce(){return $&6?ie():Ml!==-1?Ml:Ml=ie()}function Kt(e){return e.mode&1?$&2&&ve!==0?ve&-ve:Em.transition!==null?(Ol===0&&(Ol=Bc()),Ol):(e=G,e!==0||(e=window.event,e=e===void 0?16:Vc(e.type)),e):1}function it(e,t,r,n){if(50<In)throw In=0,fi=null,Error(S(185));Xn(e,r,n),(!($&2)||e!==me)&&(e===me&&(!($&2)&&(wo|=r),fe===4&&Ht(e,ve)),Pe(e,n),r===1&&$===0&&!(t.mode&1)&&(Jr=ie()+500,ho&&rr()))}function Pe(e,t){var r=e.callbackNode;Ep(e,t);var n=Wl(e,e===me?ve:0);if(n===0)r!==null&&Js(r),e.callbackNode=null,e.callbackPriority=0;else if(t=n&-n,e.callbackPriority!==t){if(r!=null&&Js(r),t===1)e.tag===0?Sm(Wu.bind(null,e)):cd(Wu.bind(null,e)),ym(function(){!($&6)&&rr()}),r=null;else{switch(Ac(n)){case 1:r=Ii;break;case 4:r=Mc;break;case 16:r=Ul;break;case 536870912:r=Oc;break;default:r=Ul}r=uf(r,tf.bind(null,e))}e.callbackPriority=t,e.callbackNode=r}}function tf(e,t){if(Ml=-1,Ol=0,$&6)throw Error(S(327));var r=e.callbackNode;if($r()&&e.callbackNode!==r)return null;var n=Wl(e,e===me?ve:0);if(n===0)return null;if(n&30||n&e.expiredLanes||t)t=io(e,n);else{t=n;var l=$;$|=2;var o=nf();(me!==e||ve!==t)&&(wt=null,Jr=ie()+500,ur(e,t));do try{Wm();break}catch(i){rf(e,i)}while(!0);Hi(),lo.current=o,$=l,ce!==null?t=0:(me=null,ve=0,t=fe)}if(t!==0){if(t===2&&(l=Aa(e),l!==0&&(n=l,t=pi(e,l))),t===1)throw r=Gn,ur(e,0),Ht(e,n),Pe(e,ie()),r;if(t===6)Ht(e,n);else{if(l=e.current.alternate,!(n&30)&&!Hm(l)&&(t=io(e,n),t===2&&(o=Aa(e),o!==0&&(n=o,t=pi(e,o))),t===1))throw r=Gn,ur(e,0),Ht(e,n),Pe(e,ie()),r;switch(e.finishedWork=l,e.finishedLanes=n,t){case 0:case 1:throw Error(S(345));case 2:or(e,Ie,wt);break;case 3:if(Ht(e,n),(n&130023424)===n&&(t=rs+500-ie(),10<t)){if(Wl(e,0)!==0)break;if(l=e.suspendedLanes,(l&n)!==n){Ce(),e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=Ya(or.bind(null,e,Ie,wt),t);break}or(e,Ie,wt);break;case 4:if(Ht(e,n),(n&4194240)===n)break;for(t=e.eventTimes,l=-1;0<n;){var a=31-at(n);o=1<<a,a=t[a],a>l&&(l=a),n&=~o}if(n=l,n=ie()-n,n=(120>n?120:480>n?480:1080>n?1080:1920>n?1920:3e3>n?3e3:4320>n?4320:1960*jm(n/1960))-n,10<n){e.timeoutHandle=Ya(or.bind(null,e,Ie,wt),n);break}or(e,Ie,wt);break;case 5:or(e,Ie,wt);break;default:throw Error(S(329))}}}return Pe(e,ie()),e.callbackNode===r?tf.bind(null,e):null}function pi(e,t){var r=_n;return e.current.memoizedState.isDehydrated&&(ur(e,t).flags|=256),e=io(e,t),e!==2&&(t=Ie,Ie=r,t!==null&&mi(t)),e}function mi(e){Ie===null?Ie=e:Ie.push.apply(Ie,e)}function Hm(e){for(var t=e;;){if(t.flags&16384){var r=t.updateQueue;if(r!==null&&(r=r.stores,r!==null))for(var n=0;n<r.length;n++){var l=r[n],o=l.getSnapshot;l=l.value;try{if(!st(o(),l))return!1}catch{return!1}}}if(r=t.child,t.subtreeFlags&16384&&r!==null)r.return=t,t=r;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function Ht(e,t){for(t&=~ts,t&=~wo,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var r=31-at(t),n=1<<r;e[r]=-1,t&=~n}}function Wu(e){if($&6)throw Error(S(327));$r();var t=Wl(e,0);if(!(t&1))return Pe(e,ie()),null;var r=io(e,t);if(e.tag!==0&&r===2){var n=Aa(e);n!==0&&(t=n,r=pi(e,n))}if(r===1)throw r=Gn,ur(e,0),Ht(e,t),Pe(e,ie()),r;if(r===6)throw Error(S(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,or(e,Ie,wt),Pe(e,ie()),null}function ns(e,t){var r=$;$|=1;try{return e(t)}finally{$=r,$===0&&(Jr=ie()+500,ho&&rr())}}function hr(e){Wt!==null&&Wt.tag===0&&!($&6)&&$r();var t=$;$|=1;var r=Ze.transition,n=G;try{if(Ze.transition=null,G=1,e)return e()}finally{G=n,Ze.transition=r,$=t,!($&6)&&rr()}}function ls(){De=Mr.current,K(Mr)}function ur(e,t){e.finishedWork=null,e.finishedLanes=0;var r=e.timeoutHandle;if(r!==-1&&(e.timeoutHandle=-1,vm(r)),ce!==null)for(r=ce.return;r!==null;){var n=r;switch(Bi(n),n.tag){case 1:n=n.type.childContextTypes,n!=null&&Xl();break;case 3:Qr(),K(Re),K(Se),Yi();break;case 5:Gi(n);break;case 4:Qr();break;case 13:K(q);break;case 19:K(q);break;case 10:Ui(n.type._context);break;case 22:case 23:ls()}r=r.return}if(me=e,ce=e=Jt(e.current,null),ve=De=t,fe=0,Gn=null,ts=wo=gr=0,Ie=_n=null,ir!==null){for(t=0;t<ir.length;t++)if(r=ir[t],n=r.interleaved,n!==null){r.interleaved=null;var l=n.next,o=r.pending;if(o!==null){var a=o.next;o.next=l,n.next=a}r.pending=n}ir=null}return e}function rf(e,t){do{var r=ce;try{if(Hi(),Fl.current=no,ro){for(var n=ee.memoizedState;n!==null;){var l=n.queue;l!==null&&(l.pending=null),n=n.next}ro=!1}if(mr=0,pe=de=ee=null,Nn=!1,Wn=0,es.current=null,r===null||r.return===null){fe=1,Gn=t,ce=null;break}e:{var o=e,a=r.return,i=r,s=t;if(t=ve,i.flags|=32768,s!==null&&typeof s=="object"&&typeof s.then=="function"){var c=s,h=i,v=h.tag;if(!(h.mode&1)&&(v===0||v===11||v===15)){var g=h.alternate;g?(h.updateQueue=g.updateQueue,h.memoizedState=g.memoizedState,h.lanes=g.lanes):(h.updateQueue=null,h.memoizedState=null)}var w=Ru(a);if(w!==null){w.flags&=-257,Tu(w,a,i,o,t),w.mode&1&&Lu(o,c,t),t=w,s=c;var E=t.updateQueue;if(E===null){var x=new Set;x.add(s),t.updateQueue=x}else E.add(s);break e}else{if(!(t&1)){Lu(o,c,t),os();break e}s=Error(S(426))}}else if(Z&&i.mode&1){var W=Ru(a);if(W!==null){!(W.flags&65536)&&(W.flags|=256),Tu(W,a,i,o,t),Ai(Kr(s,i));break e}}o=s=Kr(s,i),fe!==4&&(fe=2),_n===null?_n=[o]:_n.push(o),o=a;do{switch(o.tag){case 3:o.flags|=65536,t&=-t,o.lanes|=t;var f=Ad(o,s,t);Eu(o,f);break e;case 1:i=s;var d=o.type,m=o.stateNode;if(!(o.flags&128)&&(typeof d.getDerivedStateFromError=="function"||m!==null&&typeof m.componentDidCatch=="function"&&(Qt===null||!Qt.has(m)))){o.flags|=65536,t&=-t,o.lanes|=t;var k=jd(o,i,t);Eu(o,k);break e}}o=o.return}while(o!==null)}of(r)}catch(y){t=y,ce===r&&r!==null&&(ce=r=r.return);continue}break}while(!0)}function nf(){var e=lo.current;return lo.current=no,e===null?no:e}function os(){(fe===0||fe===3||fe===2)&&(fe=4),me===null||!(gr&268435455)&&!(wo&268435455)||Ht(me,ve)}function io(e,t){var r=$;$|=2;var n=nf();(me!==e||ve!==t)&&(wt=null,ur(e,t));do try{Um();break}catch(l){rf(e,l)}while(!0);if(Hi(),$=r,lo.current=n,ce!==null)throw Error(S(261));return me=null,ve=0,fe}function Um(){for(;ce!==null;)lf(ce)}function Wm(){for(;ce!==null&&!mp();)lf(ce)}function lf(e){var t=sf(e.alternate,e,De);e.memoizedProps=e.pendingProps,t===null?of(e):ce=t,es.current=null}function of(e){var t=e;do{var r=t.alternate;if(e=t.return,t.flags&32768){if(r=Mm(r,t),r!==null){r.flags&=32767,ce=r;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{fe=6,ce=null;return}}else if(r=Dm(r,t,De),r!==null){ce=r;return}if(t=t.sibling,t!==null){ce=t;return}ce=t=e}while(t!==null);fe===0&&(fe=5)}function or(e,t,r){var n=G,l=Ze.transition;try{Ze.transition=null,G=1,$m(e,t,r,n)}finally{Ze.transition=l,G=n}return null}function $m(e,t,r,n){do $r();while(Wt!==null);if($&6)throw Error(S(327));r=e.finishedWork;var l=e.finishedLanes;if(r===null)return null;if(e.finishedWork=null,e.finishedLanes=0,r===e.current)throw Error(S(177));e.callbackNode=null,e.callbackPriority=0;var o=r.lanes|r.childLanes;if(Cp(e,o),e===me&&(ce=me=null,ve=0),!(r.subtreeFlags&2064)&&!(r.flags&2064)||Nl||(Nl=!0,uf(Ul,function(){return $r(),null})),o=(r.flags&15990)!==0,r.subtreeFlags&15990||o){o=Ze.transition,Ze.transition=null;var a=G;G=1;var i=$;$|=4,es.current=null,Bm(e,r),qd(r,e),cm(Va),$l=!!$a,Va=$a=null,e.current=r,Am(r),gp(),$=i,G=a,Ze.transition=o}else e.current=r;if(Nl&&(Nl=!1,Wt=e,ao=l),o=e.pendingLanes,o===0&&(Qt=null),yp(r.stateNode),Pe(e,ie()),t!==null)for(n=e.onRecoverableError,r=0;r<t.length;r++)l=t[r],n(l.value,{componentStack:l.stack,digest:l.digest});if(oo)throw oo=!1,e=di,di=null,e;return ao&1&&e.tag!==0&&$r(),o=e.pendingLanes,o&1?e===fi?In++:(In=0,fi=e):In=0,rr(),null}function $r(){if(Wt!==null){var e=Ac(ao),t=Ze.transition,r=G;try{if(Ze.transition=null,G=16>e?16:e,Wt===null)var n=!1;else{if(e=Wt,Wt=null,ao=0,$&6)throw Error(S(331));var l=$;for($|=4,I=e.current;I!==null;){var o=I,a=o.child;if(I.flags&16){var i=o.deletions;if(i!==null){for(var s=0;s<i.length;s++){var c=i[s];for(I=c;I!==null;){var h=I;switch(h.tag){case 0:case 11:case 15:bn(8,h,o)}var v=h.child;if(v!==null)v.return=h,I=v;else for(;I!==null;){h=I;var g=h.sibling,w=h.return;if(Kd(h),h===c){I=null;break}if(g!==null){g.return=w,I=g;break}I=w}}}var E=o.alternate;if(E!==null){var x=E.child;if(x!==null){E.child=null;do{var W=x.sibling;x.sibling=null,x=W}while(x!==null)}}I=o}}if(o.subtreeFlags&2064&&a!==null)a.return=o,I=a;else e:for(;I!==null;){if(o=I,o.flags&2048)switch(o.tag){case 0:case 11:case 15:bn(9,o,o.return)}var f=o.sibling;if(f!==null){f.return=o.return,I=f;break e}I=o.return}}var d=e.current;for(I=d;I!==null;){a=I;var m=a.child;if(a.subtreeFlags&2064&&m!==null)m.return=a,I=m;else e:for(a=d;I!==null;){if(i=I,i.flags&2048)try{switch(i.tag){case 0:case 11:case 15:xo(9,i)}}catch(y){le(i,i.return,y)}if(i===a){I=null;break e}var k=i.sibling;if(k!==null){k.return=i.return,I=k;break e}I=i.return}}if($=l,rr(),mt&&typeof mt.onPostCommitFiberRoot=="function")try{mt.onPostCommitFiberRoot(co,e)}catch{}n=!0}return n}finally{G=r,Ze.transition=t}}return!1}function $u(e,t,r){t=Kr(r,t),t=Ad(e,t,1),e=Xt(e,t,1),t=Ce(),e!==null&&(Xn(e,1,t),Pe(e,t))}function le(e,t,r){if(e.tag===3)$u(e,e,r);else for(;t!==null;){if(t.tag===3){$u(t,e,r);break}else if(t.tag===1){var n=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof n.componentDidCatch=="function"&&(Qt===null||!Qt.has(n))){e=Kr(r,e),e=jd(t,e,1),t=Xt(t,e,1),e=Ce(),t!==null&&(Xn(t,1,e),Pe(t,e));break}}t=t.return}}function Vm(e,t,r){var n=e.pingCache;n!==null&&n.delete(t),t=Ce(),e.pingedLanes|=e.suspendedLanes&r,me===e&&(ve&r)===r&&(fe===4||fe===3&&(ve&130023424)===ve&&500>ie()-rs?ur(e,0):ts|=r),Pe(e,t)}function af(e,t){t===0&&(e.mode&1?(t=gl,gl<<=1,!(gl&130023424)&&(gl=4194304)):t=1);var r=Ce();e=It(e,t),e!==null&&(Xn(e,t,r),Pe(e,r))}function Gm(e){var t=e.memoizedState,r=0;t!==null&&(r=t.retryLane),af(e,r)}function Ym(e,t){var r=0;switch(e.tag){case 13:var n=e.stateNode,l=e.memoizedState;l!==null&&(r=l.retryLane);break;case 19:n=e.stateNode;break;default:throw Error(S(314))}n!==null&&n.delete(t),af(e,r)}var sf;sf=function(e,t,r){if(e!==null)if(e.memoizedProps!==t.pendingProps||Re.current)Le=!0;else{if(!(e.lanes&r)&&!(t.flags&128))return Le=!1,zm(e,t,r);Le=!!(e.flags&131072)}else Le=!1,Z&&t.flags&1048576&&dd(t,Jl,t.index);switch(t.lanes=0,t.tag){case 2:var n=t.type;Dl(e,t),e=t.pendingProps;var l=Gr(t,Se.current);Wr(t,r),l=Qi(null,t,n,e,l,r);var o=Ki();return t.flags|=1,typeof l=="object"&&l!==null&&typeof l.render=="function"&&l.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Te(n)?(o=!0,Ql(t)):o=!1,t.memoizedState=l.state!==null&&l.state!==void 0?l.state:null,$i(t),l.updater=yo,t.stateNode=l,l._reactInternals=t,ei(t,n,e,r),t=ni(null,t,n,!0,o,r)):(t.tag=0,Z&&o&&Oi(t),Ee(null,t,l,r),t=t.child),t;case 16:n=t.elementType;e:{switch(Dl(e,t),e=t.pendingProps,l=n._init,n=l(n._payload),t.type=n,l=t.tag=Qm(n),e=nt(n,e),l){case 0:t=ri(null,t,n,e,r);break e;case 1:t=zu(null,t,n,e,r);break e;case 11:t=Pu(null,t,n,e,r);break e;case 14:t=Fu(null,t,n,nt(n.type,e),r);break e}throw Error(S(306,n,""))}return t;case 0:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:nt(n,l),ri(e,t,n,l,r);case 1:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:nt(n,l),zu(e,t,n,l,r);case 3:e:{if($d(t),e===null)throw Error(S(387));n=t.pendingProps,o=t.memoizedState,l=o.element,vd(e,t),eo(t,n,null,r);var a=t.memoizedState;if(n=a.element,o.isDehydrated)if(o={element:n,isDehydrated:!1,cache:a.cache,pendingSuspenseBoundaries:a.pendingSuspenseBoundaries,transitions:a.transitions},t.updateQueue.baseState=o,t.memoizedState=o,t.flags&256){l=Kr(Error(S(423)),t),t=Du(e,t,n,r,l);break e}else if(n!==l){l=Kr(Error(S(424)),t),t=Du(e,t,n,r,l);break e}else for(Oe=Yt(t.stateNode.containerInfo.firstChild),Be=t,Z=!0,ot=null,r=gd(t,null,n,r),t.child=r;r;)r.flags=r.flags&-3|4096,r=r.sibling;else{if(Yr(),n===l){t=Lt(e,t,r);break e}Ee(e,t,n,r)}t=t.child}return t;case 5:return yd(t),e===null&&Ja(t),n=t.type,l=t.pendingProps,o=e!==null?e.memoizedProps:null,a=l.children,Ga(n,l)?a=null:o!==null&&Ga(n,o)&&(t.flags|=32),Wd(e,t),Ee(e,t,a,r),t.child;case 6:return e===null&&Ja(t),null;case 13:return Vd(e,t,r);case 4:return Vi(t,t.stateNode.containerInfo),n=t.pendingProps,e===null?t.child=Xr(t,null,n,r):Ee(e,t,n,r),t.child;case 11:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:nt(n,l),Pu(e,t,n,l,r);case 7:return Ee(e,t,t.pendingProps,r),t.child;case 8:return Ee(e,t,t.pendingProps.children,r),t.child;case 12:return Ee(e,t,t.pendingProps.children,r),t.child;case 10:e:{if(n=t.type._context,l=t.pendingProps,o=t.memoizedProps,a=l.value,X(Zl,n._currentValue),n._currentValue=a,o!==null)if(st(o.value,a)){if(o.children===l.children&&!Re.current){t=Lt(e,t,r);break e}}else for(o=t.child,o!==null&&(o.return=t);o!==null;){var i=o.dependencies;if(i!==null){a=o.child;for(var s=i.firstContext;s!==null;){if(s.context===n){if(o.tag===1){s=Nt(-1,r&-r),s.tag=2;var c=o.updateQueue;if(c!==null){c=c.shared;var h=c.pending;h===null?s.next=s:(s.next=h.next,h.next=s),c.pending=s}}o.lanes|=r,s=o.alternate,s!==null&&(s.lanes|=r),Za(o.return,r,t),i.lanes|=r;break}s=s.next}}else if(o.tag===10)a=o.type===t.type?null:o.child;else if(o.tag===18){if(a=o.return,a===null)throw Error(S(341));a.lanes|=r,i=a.alternate,i!==null&&(i.lanes|=r),Za(a,r,t),a=o.sibling}else a=o.child;if(a!==null)a.return=o;else for(a=o;a!==null;){if(a===t){a=null;break}if(o=a.sibling,o!==null){o.return=a.return,a=o;break}a=a.return}o=a}Ee(e,t,l.children,r),t=t.child}return t;case 9:return l=t.type,n=t.pendingProps.children,Wr(t,r),l=qe(l),n=n(l),t.flags|=1,Ee(e,t,n,r),t.child;case 14:return n=t.type,l=nt(n,t.pendingProps),l=nt(n.type,l),Fu(e,t,n,l,r);case 15:return Hd(e,t,t.type,t.pendingProps,r);case 17:return n=t.type,l=t.pendingProps,l=t.elementType===n?l:nt(n,l),Dl(e,t),t.tag=1,Te(n)?(e=!0,Ql(t)):e=!1,Wr(t,r),Bd(t,n,l),ei(t,n,l,r),ni(null,t,n,!0,e,r);case 19:return Gd(e,t,r);case 22:return Ud(e,t,r)}throw Error(S(156,t.tag))};function uf(e,t){return Dc(e,t)}function Xm(e,t,r,n){this.tag=e,this.key=r,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=n,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Je(e,t,r,n){return new Xm(e,t,r,n)}function as(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Qm(e){if(typeof e=="function")return as(e)?1:0;if(e!=null){if(e=e.$$typeof,e===Ni)return 11;if(e===bi)return 14}return 2}function Jt(e,t){var r=e.alternate;return r===null?(r=Je(e.tag,t,e.key,e.mode),r.elementType=e.elementType,r.type=e.type,r.stateNode=e.stateNode,r.alternate=e,e.alternate=r):(r.pendingProps=t,r.type=e.type,r.flags=0,r.subtreeFlags=0,r.deletions=null),r.flags=e.flags&14680064,r.childLanes=e.childLanes,r.lanes=e.lanes,r.child=e.child,r.memoizedProps=e.memoizedProps,r.memoizedState=e.memoizedState,r.updateQueue=e.updateQueue,t=e.dependencies,r.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},r.sibling=e.sibling,r.index=e.index,r.ref=e.ref,r}function Bl(e,t,r,n,l,o){var a=2;if(n=e,typeof e=="function")as(e)&&(a=1);else if(typeof e=="string")a=5;else e:switch(e){case br:return cr(r.children,l,o,t);case Ci:a=8,l|=8;break;case Ca:return e=Je(12,r,t,l|2),e.elementType=Ca,e.lanes=o,e;case Na:return e=Je(13,r,t,l),e.elementType=Na,e.lanes=o,e;case ba:return e=Je(19,r,t,l),e.elementType=ba,e.lanes=o,e;case yc:return ko(r,l,o,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case hc:a=10;break e;case vc:a=9;break e;case Ni:a=11;break e;case bi:a=14;break e;case Ot:a=16,n=null;break e}throw Error(S(130,e==null?e:typeof e,""))}return t=Je(a,r,t,l),t.elementType=e,t.type=n,t.lanes=o,t}function cr(e,t,r,n){return e=Je(7,e,n,t),e.lanes=r,e}function ko(e,t,r,n){return e=Je(22,e,n,t),e.elementType=yc,e.lanes=r,e.stateNode={isHidden:!1},e}function ya(e,t,r){return e=Je(6,e,null,t),e.lanes=r,e}function xa(e,t,r){return t=Je(4,e.children!==null?e.children:[],e.key,t),t.lanes=r,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Km(e,t,r,n,l){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=qo(0),this.expirationTimes=qo(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=qo(0),this.identifierPrefix=n,this.onRecoverableError=l,this.mutableSourceEagerHydrationData=null}function is(e,t,r,n,l,o,a,i,s){return e=new Km(e,t,r,i,s),t===1?(t=1,o===!0&&(t|=8)):t=0,o=Je(3,null,null,t),e.current=o,o.stateNode=e,o.memoizedState={element:n,isDehydrated:r,cache:null,transitions:null,pendingSuspenseBoundaries:null},$i(o),e}function Jm(e,t,r){var n=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Nr,key:n==null?null:""+n,children:e,containerInfo:t,implementation:r}}function cf(e){if(!e)return qt;e=e._reactInternals;e:{if(yr(e)!==e||e.tag!==1)throw Error(S(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Te(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(S(171))}if(e.tag===1){var r=e.type;if(Te(r))return ud(e,r,t)}return t}function df(e,t,r,n,l,o,a,i,s){return e=is(r,n,!0,e,l,o,a,i,s),e.context=cf(null),r=e.current,n=Ce(),l=Kt(r),o=Nt(n,l),o.callback=t??null,Xt(r,o,l),e.current.lanes=l,Xn(e,l,n),Pe(e,n),e}function So(e,t,r,n){var l=t.current,o=Ce(),a=Kt(l);return r=cf(r),t.context===null?t.context=r:t.pendingContext=r,t=Nt(o,a),t.payload={element:e},n=n===void 0?null:n,n!==null&&(t.callback=n),e=Xt(l,t,a),e!==null&&(it(e,l,a,o),Pl(e,l,a)),a}function so(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function Vu(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var r=e.retryLane;e.retryLane=r!==0&&r<t?r:t}}function ss(e,t){Vu(e,t),(e=e.alternate)&&Vu(e,t)}function Zm(){return null}var ff=typeof reportError=="function"?reportError:function(e){console.error(e)};function us(e){this._internalRoot=e}Eo.prototype.render=us.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(S(409));So(e,t,null,null)};Eo.prototype.unmount=us.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;hr(function(){So(null,e,null,null)}),t[_t]=null}};function Eo(e){this._internalRoot=e}Eo.prototype.unstable_scheduleHydration=function(e){if(e){var t=Uc();e={blockedOn:null,target:e,priority:t};for(var r=0;r<jt.length&&t!==0&&t<jt[r].priority;r++);jt.splice(r,0,e),r===0&&$c(e)}};function cs(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function Co(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function Gu(){}function qm(e,t,r,n,l){if(l){if(typeof n=="function"){var o=n;n=function(){var c=so(a);o.call(c)}}var a=df(t,n,e,0,null,!1,!1,"",Gu);return e._reactRootContainer=a,e[_t]=a.current,Bn(e.nodeType===8?e.parentNode:e),hr(),a}for(;l=e.lastChild;)e.removeChild(l);if(typeof n=="function"){var i=n;n=function(){var c=so(s);i.call(c)}}var s=is(e,0,!1,null,null,!1,!1,"",Gu);return e._reactRootContainer=s,e[_t]=s.current,Bn(e.nodeType===8?e.parentNode:e),hr(function(){So(t,s,r,n)}),s}function No(e,t,r,n,l){var o=r._reactRootContainer;if(o){var a=o;if(typeof l=="function"){var i=l;l=function(){var s=so(a);i.call(s)}}So(t,a,e,l)}else a=qm(r,t,e,l,n);return so(a)}jc=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var r=yn(t.pendingLanes);r!==0&&(Li(t,r|1),Pe(t,ie()),!($&6)&&(Jr=ie()+500,rr()))}break;case 13:hr(function(){var n=It(e,1);if(n!==null){var l=Ce();it(n,e,1,l)}}),ss(e,1)}};Ri=function(e){if(e.tag===13){var t=It(e,134217728);if(t!==null){var r=Ce();it(t,e,134217728,r)}ss(e,134217728)}};Hc=function(e){if(e.tag===13){var t=Kt(e),r=It(e,t);if(r!==null){var n=Ce();it(r,e,t,n)}ss(e,t)}};Uc=function(){return G};Wc=function(e,t){var r=G;try{return G=e,t()}finally{G=r}};Ma=function(e,t,r){switch(t){case"input":if(La(e,r),t=r.name,r.type==="radio"&&t!=null){for(r=e;r.parentNode;)r=r.parentNode;for(r=r.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<r.length;t++){var n=r[t];if(n!==e&&n.form===e.form){var l=go(n);if(!l)throw Error(S(90));wc(n),La(n,l)}}}break;case"textarea":Sc(e,r);break;case"select":t=r.value,t!=null&&Ar(e,!!r.multiple,t,!1)}};Lc=ns;Rc=hr;var e0={usingClientEntryPoint:!1,Events:[Kn,Rr,go,_c,Ic,ns]},pn={findFiberByHostInstance:ar,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},t0={bundleType:pn.bundleType,version:pn.version,rendererPackageName:pn.rendererPackageName,rendererConfig:pn.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Rt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=Fc(e),e===null?null:e.stateNode},findFiberByHostInstance:pn.findFiberByHostInstance||Zm,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var bl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!bl.isDisabled&&bl.supportsFiber)try{co=bl.inject(t0),mt=bl}catch{}}je.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=e0;je.createPortal=function(e,t){var r=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!cs(t))throw Error(S(200));return Jm(e,t,null,r)};je.createRoot=function(e,t){if(!cs(e))throw Error(S(299));var r=!1,n="",l=ff;return t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(n=t.identifierPrefix),t.onRecoverableError!==void 0&&(l=t.onRecoverableError)),t=is(e,1,!1,null,null,r,!1,n,l),e[_t]=t.current,Bn(e.nodeType===8?e.parentNode:e),new us(t)};je.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(S(188)):(e=Object.keys(e).join(","),Error(S(268,e)));return e=Fc(t),e=e===null?null:e.stateNode,e};je.flushSync=function(e){return hr(e)};je.hydrate=function(e,t,r){if(!Co(t))throw Error(S(200));return No(null,e,t,!0,r)};je.hydrateRoot=function(e,t,r){if(!cs(e))throw Error(S(405));var n=r!=null&&r.hydratedSources||null,l=!1,o="",a=ff;if(r!=null&&(r.unstable_strictMode===!0&&(l=!0),r.identifierPrefix!==void 0&&(o=r.identifierPrefix),r.onRecoverableError!==void 0&&(a=r.onRecoverableError)),t=df(t,null,e,1,r??null,l,!1,o,a),e[_t]=t.current,Bn(e),n)for(e=0;e<n.length;e++)r=n[e],l=r._getVersion,l=l(r._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[r,l]:t.mutableSourceEagerHydrationData.push(r,l);return new Eo(t)};je.render=function(e,t,r){if(!Co(t))throw Error(S(200));return No(null,e,t,!1,r)};je.unmountComponentAtNode=function(e){if(!Co(e))throw Error(S(40));return e._reactRootContainer?(hr(function(){No(null,null,e,!1,function(){e._reactRootContainer=null,e[_t]=null})}),!0):!1};je.unstable_batchedUpdates=ns;je.unstable_renderSubtreeIntoContainer=function(e,t,r,n){if(!Co(r))throw Error(S(200));if(e==null||e._reactInternals===void 0)throw Error(S(38));return No(e,t,r,!1,n)};je.version="18.3.1-next-f1338f8080-20240426";function pf(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(pf)}catch(e){console.error(e)}}pf(),fc.exports=je;var r0=fc.exports,Yu=r0;Sa.createRoot=Yu.createRoot,Sa.hydrateRoot=Yu.hydrateRoot;const oe=[7,6,7,6,7,6,7];function Me(e){return`L${e.layer}-R${e.row}-C${e.col}`}function n0(e,t){if(e.layer<1||e.layer>t||e.row<0||e.row>=oe.length)return!1;const r=oe[e.row];return!(e.col<0||e.col>=r)}function Cr(e,t,r){if(!n0(e,t))throw new Error(`${r} out of bounds: L${e.layer} R${e.row} C${e.col}. Valid rows: 0..${oe.length-1}, layers: 1..${t}.`)}function l0(e){Cr(e.start,e.layers,"scenario.start"),Cr(e.goal,e.layers,"scenario.goal");for(const i of e.missing)Cr(i,e.layers,"scenario.missing");for(const i of e.blocked)Cr(i,e.layers,"scenario.blocked");for(const i of e.transitions)Cr(i.from,e.layers,"scenario.transitions.from"),Cr(i.to,e.layers,"scenario.transitions.to");const t=new Set(e.missing.map(Me)),r=new Set(e.blocked.map(Me)),n=new Map,l=new Map;for(let i=1;i<=e.layers;i++){const s=[];for(let c=0;c<oe.length;c++){const h=oe[c],v=[];for(let g=0;g<h;g++){const w=Me({layer:i,row:c,col:g}),E=t.has(w),x=r.has(w),W=w===Me(e.goal),f={id:w,pos:{layer:i,row:c,col:g},kind:W?"GOAL":"NORMAL",missing:E,blocked:x,revealed:!1};n.set(w,f),v.push(w)}s.push(v)}l.set(i,s)}const o=new Map;for(const i of e.transitions)o.set(Me(i.from),i);const a={scenario:e,turn:0,visibleLayers:new Set,playerHexId:Me(e.start),hexesById:n,rows:l,transitionsByFromId:o};return At(a,e.start.layer),dr(a,a.playerHexId),a}function dr(e,t){const r=e.hexesById.get(t);r&&(r.revealed=!0)}function At(e,t){const r=e.visibleLayers.has(t);if(e.visibleLayers.add(t),r||!e.scenario.revealOnEnterGuaranteedUp)return null;const n=e.rows.get(t);if(!n)return null;for(const l of n)for(const o of l){const a=e.hexesById.get(o);if(!a||a.missing||a.blocked)continue;const i=e.transitionsByFromId.get(o);if((i==null?void 0:i.type)==="UP")return dr(e,o),e.lastGuaranteedUpId=o,e.lastGuaranteedUpTurn=e.turn,o}return null}const uo=7;function o0(e,t=uo){if(e.layer<1||e.layer>t||e.row<0||e.row>=oe.length)return!1;const r=oe[e.row];return e.col>=0&&e.col<r}function Or(e,t,r=uo){if(!o0(e,r))throw new Error(`${t} out of bounds: ${JSON.stringify(e)}`)}function a0(e){if(!e||typeof e!="object")throw new Error("Scenario is missing/invalid");if(!e.id||!e.name)throw new Error("Scenario needs id and name");if(e.layers!==uo)throw new Error(`v0.1 expects layers=${uo}`);if(!e.start||!e.goal)throw new Error("Scenario missing start/goal");e.missing=e.missing??[],e.blocked=e.blocked??[],e.transitions=e.transitions??[],e.movement=e.movement??{},typeof e.revealOnEnterGuaranteedUp!="boolean"&&(e.revealOnEnterGuaranteedUp=!0),Or(e.start,"start",e.layers),Or(e.goal,"goal",e.layers);for(const s of e.missing)Or(s,"missing",e.layers);for(const s of e.blocked)Or(s,"blocked",e.layers);const t=new Set(e.missing.map(Me)),r=new Set(e.blocked.map(Me)),n=Me(e.start),l=Me(e.goal);if(t.has(n)||r.has(n))throw new Error("Start cannot be missing/blocked");if(t.has(l)||r.has(l))throw new Error("Goal cannot be missing/blocked");const o=new Set,a=new Map;for(const s of e.transitions){i0(s,e.layers);const c=Me(s.from);if(o.has(c))throw new Error(`Multiple transitions from same hex: ${c}`);if(o.add(c),t.has(c)||r.has(c))throw new Error(`Transition FROM missing/blocked: ${c}`);const h=Me(s.to);if(t.has(h)||r.has(h))throw new Error(`Transition TO missing/blocked: ${h}`);s.type==="UP"&&a.set(s.from.layer,(a.get(s.from.layer)??0)+1)}const i=new Set(["NONE","SEVEN_LEFT_SIX_RIGHT","TOP3_RIGHT_BOTTOM4_LEFT"]);for(const[s,c]of Object.entries(e.movement)){const h=Number(s);if(!Number.isFinite(h)||h<1||h>e.layers)throw new Error(`Invalid movement layer key: ${s}`);if(!i.has(c))throw new Error(`Invalid movement pattern on layer ${h}: ${String(c)}`)}if(e.movement[1]&&e.movement[1]!=="NONE")throw new Error("v0.1: Layer 1 must be NONE/static");if(e.revealOnEnterGuaranteedUp){for(let s=1;s<=e.layers;s++)if((a.get(s)??0)===0)throw new Error(`revealOnEnterGuaranteedUp is true, but Layer ${s} has no usable UP transitions.`)}}function i0(e,t){if(!e)throw new Error("Transition missing");if(e.type!=="UP"&&e.type!=="DOWN")throw new Error(`Invalid transition type: ${String(e.type)}`);if(!e.from||!e.to)throw new Error("Transition missing from/to");Or(e.from,"Transition FROM",t),Or(e.to,"Transition TO",t)}function gi(e,t,r){const n=e.rows.get(t);if(!n)return null;for(let l=0;l<n.length;l++){const o=n[l].indexOf(r);if(o>=0)return{row:l,col:o}}return null}function mf(e,t,r,n){const l=e.rows.get(t);if(!l)return null;const o=l[r];return!o||n<0||n>=o.length?null:o[n]}function s0(e,t){const r=[],n=oe[e]??7;t-1>=0&&r.push({r:e,c:t-1}),t+1<n&&r.push({r:e,c:t+1});const l=e-1,o=e+1,a=l>=0?oe[l]??7:0,i=o<oe.length?oe[o]??7:0,s=n===6,c=s?t:t-1,h=s?t+1:t,v=s?t:t-1,g=s?t+1:t;return l>=0&&(c>=0&&c<a&&r.push({r:l,c}),h>=0&&h<a&&r.push({r:l,c:h})),o<oe.length&&(v>=0&&v<i&&r.push({r:o,c:v}),g>=0&&g<i&&r.push({r:o,c:g})),r}function u0(e,t,r){const n=oe[r]??7,l=e.rows.get(t);if(!l)return 0;const o=l[r];if(!(o!=null&&o.length))return 0;const a=`L${t}-R${r}-C0`,i=o.indexOf(a);return i<0?0:i>n/2?i-n:i}function c0(e,t,r){const n=u0(e,t,r);return n===0?"":n<0?`L${Math.abs(n)}`:`R${n}`}function Xu(e,t,r){if(!t||!r)return"down";const n=e.hexesById.get(t),l=e.hexesById.get(r);if(!n||!l||n.pos.layer!==l.pos.layer)return"down";const o=n.pos.layer,a=gi(e,o,t),i=gi(e,o,r);if(!a||!i)return"down";const s=oe[a.row]??7;let c=i.col-a.col;a.row===i.row&&(c=(c+s/2)%s-s/2);const h=i.row-a.row;return Math.abs(c)>=Math.abs(h)*.5?c>0?"right":c<0?"left":"down":h>0?"down":"up"}function Ln(e,t){const r=e.hexesById.get(t);if(!r)return[];const n=r.pos.layer,l=gi(e,n,t);if(!l)return[];const o=s0(l.row,l.col),a=[];for(const i of o){const s=mf(e,n,i.r,i.c);s&&a.push(s)}return a}function gf(e,t){const r=e.hexesById.get(e.playerHexId);if(!r)return{ok:!1,reason:"INVALID"};const n=e.hexesById.get(t);if(!n)return{ok:!1,reason:"INVALID"};if(r.pos.layer!==n.pos.layer)return{ok:!1,reason:"INVALID"};if(!new Set(Ln(e,e.playerHexId)).has(t))return{ok:!1,reason:"INVALID"};if(n.blocked||n.missing)return hi(e),{ok:!1,reason:"BLOCKED"};e.playerHexId=t,dr(e,t);let o=!1;const a=e.transitionsByFromId.get(t);if(a){const c=Me(a.to),h=e.hexesById.get(c);h&&!h.blocked&&!h.missing&&(o=!0,e.playerHexId=c,At(e,a.to.layer),dr(e,c))}const i=e.hexesById.get(e.playerHexId),s=!!i&&i.kind==="GOAL";return hi(e),{ok:!0,triggeredTransition:o,won:s}}function d0(e){hi(e)}function hi(e){var n;e.turn+=1;const t=e.scenario.movement??{},r=Number((n=e.scenario)==null?void 0:n.layers)||(e.rows&&typeof e.rows.size=="number"?e.rows.size:1);for(let l=1;l<=r;l++){const o=f0(t,l);p0(e,l,o)}}function f0(e,t){return e[String(t)]??"NONE"}function p0(e,t,r){if(r==="NONE")return;const n=e.rows.get(t);if(n)for(let l=0;l<n.length;l++){const o=n[l];if(o.length<=1)continue;let a="L";if(r==="SEVEN_LEFT_SIX_RIGHT"?a=o.length===7?"L":"R":r==="TOP3_RIGHT_BOTTOM4_LEFT"&&(a=l<=2?"R":"L"),a==="L"){const i=o.shift();i!=null&&o.push(i)}else{const i=o.pop();i!=null&&o.unshift(i)}}}function Qu(e){return{turn:e.turn,visibleLayers:Array.from(e.visibleLayers),playerHexId:e.playerHexId,rows:Array.from(e.rows.entries()).map(([t,r])=>({layer:t,rows:r.map(n=>[...n])})),lastGuaranteedUpId:e.lastGuaranteedUpId,lastGuaranteedUpTurn:e.lastGuaranteedUpTurn}}function Ku(e,t){const r=e.hexesById,n=e.transitionsByFromId,l=e.scenario,o=new Map;for(const a of t.rows)o.set(a.layer,a.rows.map(i=>[...i]));return{scenario:l,turn:t.turn,visibleLayers:new Set(t.visibleLayers),playerHexId:t.playerHexId,hexesById:r,rows:o,transitionsByFromId:n,lastGuaranteedUpId:t.lastGuaranteedUpId,lastGuaranteedUpTurn:t.lastGuaranteedUpTurn}}function m0(e){for(const r of e.hexesById.values())if(r.kind==="GOAL")return r.id;const t=e.scenario.goal;return t?`L${t.layer}-R${t.row}-C${t.col}`:null}function Ju(e){let t="";const r=e.rows.slice().sort((n,l)=>n.layer-l.layer);for(const n of r){t+=`|L${n.layer}`;for(let l=0;l<n.rows.length;l++)t+=`|${n.rows[l].join(",")}`}return`p=${e.playerHexId}|t=${e.turn}${t}`}function g0(e,t=80){const r=m0(e);if(!r)return null;const n=e.hexesById.get(e.playerHexId);if(!n||n.missing||n.blocked)return null;if(e.playerHexId===r)return 0;const l=Qu(e),o=[{dto:l,turns:0}];let a=0;const i=new Set([Ju(l)]);let s=0;const c=4e5;for(;a<o.length;){if(s>=c)return null;const h=o[a++];if(s++,h.turns>=t)continue;const v=Ku(e,h.dto),g=Ln(v,v.playerHexId);for(const w of g){const E=v.hexesById.get(w);if(!E||E.missing||E.blocked)continue;const x=Ku(e,h.dto);if(!gf(x,w).ok)continue;const f=h.turns+1;if(x.playerHexId===r)return f;const d=Qu(x),m=Ju(d);i.has(m)||(i.add(m),o.push({dto:d,turns:f}))}}return null}function h0(e){return l0(e)}function v0(e,t){return g0(e,t)}function Zu(e,t){const r=gf(e,t);if(r&&typeof r=="object"&&("ok"in r&&r.ok===!1||"reason"in r&&!("state"in r)))return r;const n=r&&typeof r=="object"&&"state"in r?r.state:r;return n&&typeof n=="object"&&d0(n),r}const y0={id:"rainbow_realm",name:"Rainbow Realm",desc:"Bright, magical rainbow world",menu:{solidColor:"#1e66ff"},scenarios:[{id:"prism_path",name:"Prism Path",desc:"First rainbow scenario",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario.json",theme:{palette:{L1:"#FF4D7D",L2:"#FF9A3D",L3:"#FFD35A",L4:"#4BEE9C",L5:"#3ED7FF",L6:"#5C7CFF",L7:"#B66BFF"},assets:{backgroundGame:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",diceFacesBase:"worlds/rainbow_realm/scenarios/prism_path/assets/dice/faces",diceCornerBorder:"worlds/rainbow_realm/scenarios/prism_path/assets/dice/borders/corner_flame_red.png",villainsBase:"worlds/rainbow_realm/scenarios/prism_path/assets/villains",backgroundLayers:{L1:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L2:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L3:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L4:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L5:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L6:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png",L7:"worlds/rainbow_realm/scenarios/prism_path/assets/backgrounds/game-bg.png"}}},tracks:[{id:"t1",name:"Track 1",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario.json"},{id:"t2",name:"Track 2",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario2.json"},{id:"t3",name:"Track 3",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario3.json"},{id:"t4",name:"Track 4",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario4.json"},{id:"t5",name:"Track 5",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario4.json"},{id:"t6",name:"Track 6",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario5.json"},{id:"t7",name:"Track 7",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario6.json"},{id:"t8",name:"Track 8",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario7.json"},{id:"t9",name:"Track 9",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario8.json"},{id:"t10",name:"Track 10",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario9.json"},{id:"t11",name:"Track 11",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario10.json"},{id:"t12",name:"Track 12",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario11.json"},{id:"t13",name:"Brain Melter I",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario12.json"},{id:"t14",name:"Brain Melter II",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario13.json"},{id:"t15",name:"Brain Melter III",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario14.json"},{id:"t16",name:"Brain Melter IV",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario15.json"},{id:"t17",name:"Brain Melter V",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario16.json"},{id:"t18",name:"Brain Melter VI",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario17.json"},{id:"t19",name:"Brain Melter VII",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario18.json"},{id:"t20",name:"Brain Melter VIII",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario19.json"},{id:"t21",name:"Brain Melter IX",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario20.json"},{id:"t22",name:"Brain Melter X",scenarioJson:"worlds/rainbow_realm/scenarios/prism_path/scenario21.json"}]}]},qu=[y0],x0=Object.freeze(Object.defineProperty({__proto__:null,default:qu,worlds:qu},Symbol.toStringTag,{value:"Module"})),w0="tiles/demo",k0={normal:"NORMAL.png",blocked:"BLOCKED.png",fog:"FOG.png",goal:"GOAL.png",hole:"HOLE.png",stairsUp:"STAIRS_UP.png",stairsDown:"STAIRS_DOWN.png",start:"START.png"};function S0(e){return e.revealed?e.blocked?"blocked":e.isGoal?"goal":e.isStart?"start":e.isPortalUp?"stairsUp":e.isPortalDown?"stairsDown":"normal":"fog"}function E0(e){return`${w0}/${k0[e]}`}function C0(){const e=x0;return Array.isArray(e==null?void 0:e.worlds)&&e.worlds||Array.isArray(e==null?void 0:e.default)&&e.default||Array.isArray(e==null?void 0:e.registeredWorlds)&&e.registeredWorlds||Array.isArray(e==null?void 0:e.registry)&&e.registry||[]}function N0(e){if(!e)return null;const t=e.default??e,r=String(t.id??t.slug??t.key??"world"),n=String(t.name??t.title??r),o=(Array.isArray(t.scenarios)?t.scenarios:[]).map((a,i)=>{if(!a)return null;const s=String(a.id??a.slug??`scenario-${i}`),c=String(a.name??a.title??s),h=String(a.scenarioJson??a.json??"");if(!h)return null;const v=a.theme??{palette:{L1:"#19ffb4",L2:"#67a5ff",L3:"#ffd36a",L4:"#ff7ad1",L5:"#a1ff5a",L6:"#a58bff",L7:"#ff5d7a"},assets:{diceFacesBase:"images/dice",diceCornerBorder:"",villainsBase:"images/villains"}},g=Array.isArray(a.tracks)?a.tracks.map((w,E)=>{if(!w)return null;const x=String(w.id??`track-${E}`),W=String(w.name??x),f=String(w.scenarioJson??w.json??"");return f?{id:x,name:W,scenarioJson:f}:null}).filter(Boolean):void 0;return{id:s,name:c,desc:a.desc,scenarioJson:h,theme:v,tracks:g&&g.length?g:void 0}}).filter(Boolean);return o.length===0?null:{id:r,name:n,desc:t.desc,menu:t.menu??{},scenarios:o}}function b0(){const e=C0(),t=[];for(const r of e){const n=N0(r);n&&t.push(n)}return t.sort((r,n)=>r.name.localeCompare(n.name)),t}const Ct={current:null};function mn(e){return e&&!e.scenario&&Ct.current&&(e.scenario=Ct.current),e}function Xe(e){const t=/^L(\d+)-R(\d+)-C(\d+)$/.exec(e);return t?{layer:Number(t[1]),row:Number(t[2]),col:Number(t[3])}:null}function dt(e){const t="/TestGame/",r=String(t).endsWith("/")?String(t):`${t}/`,n=String(e).replace(/^\/+/,"");return r+n}async function _0(e){const t=await fetch(dt(e));if(!t.ok)throw new Error(`Failed to load: ${e}`);return t.json()}async function I0(e){const r=e+(e.includes("?")?"&":"?")+"v="+encodeURIComponent("20260801e"),n=await _0(r);return a0(n),n}function Br(e,t){var n;if(!e)return;const r=e.hexesById;return r!=null&&r.get?r.get(t):(n=e.hexesById)==null?void 0:n[t]}function wa(e){return e?{missing:!!e.missing,blocked:!!e.blocked}:{blocked:!0,missing:!0}}function gn(e){return`var(--L${Math.max(1,Math.min(7,Math.floor(e||1)))})`}function L0(){const e=new Date,t=String(e.getHours()).padStart(2,"0"),r=String(e.getMinutes()).padStart(2,"0");return`${t}:${r}`}function R0(e,t){const r=(e==null?void 0:e.goalHexId)??(e==null?void 0:e.goalId)??(e==null?void 0:e.exitHexId)??(e==null?void 0:e.exitId)??(e==null?void 0:e.targetHexId)??(e==null?void 0:e.targetId)??(e==null?void 0:e.winHexId)??(e==null?void 0:e.winId)??null;if(typeof r=="string"&&/^L\d+-R\d+-C\d+$/.test(r))return r;const n=(e==null?void 0:e.goal)??(e==null?void 0:e.exit)??(e==null?void 0:e.target)??null;if(n&&typeof n=="object"){const l=Number(n.layer??t),o=Number(n.row??n.r),a=Number(n.col??n.c);if(Number.isFinite(l)&&Number.isFinite(o)&&Number.isFinite(a))return`L${l}-R${o}-C${a}`}return null}function T0(e,t){for(let r=0;r<oe.length;r++){const n=oe[r];for(let l=0;l<n;l++){const o="L"+t+"-R"+r+"-C"+l,a=Br(e,o);if(a&&!a.blocked&&!a.missing)return o}}return null}function ec(e){if(!e)return null;if(typeof e=="object"&&"state"in e){const t=e.state;return t&&typeof t=="object"?(!t.scenario&&Ct.current&&(t.scenario=Ct.current),t):null}if(typeof e=="object"&&("hexesById"in e||"playerHexId"in e)){const t=e;return!t.scenario&&Ct.current&&(t.scenario=Ct.current),t}return null}function tc(e,t){return{gridColumn:((oe[e]??7)===6?t*2+2:t*2+1)+" / span 2",gridRow:e+1}}function P0(e){const t=Array.isArray(e==null?void 0:e.cardTriggers)&&e.cardTriggers||[],r=["cosmic","risk","terrain","shadow"],n=a=>a>=1&&a<=7?a-1:a,l=a=>a>=1&&a<=7?a-1:a,o=[];for(const a of t){if(!a||typeof a!="object")continue;const i=String(a.card??a.key??a.id??"cosmic"),s=r.includes(i)?i:"cosmic",c=Number(a.layer??1);let h=n(Number(a.row??0)),v=l(Number(a.col??0));!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(v)||o.push({card:s,layer:c,row:h,col:v})}return o}function F0(){const e=["bad1","bad2","bad3"];return e[Math.floor(Math.random()*e.length)]}const ka=`
:root{
  --bg0: #070814;
  --bg1: rgba(10,14,24,.92);

  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.65);

  --panel: rgba(10,14,24,.88);
  --stroke: rgba(255,255,255,.10);
  --stroke2: rgba(255,255,255,.18);

  --shadow: 0 18px 52px rgba(0,0,0,.45);
  --shadow2: 0 18px 56px rgba(0,0,0,.55);

  /* board sizing */
  --boardW: 860px;
  --boardPadTop: 18px;
  --boardPadBottom: 18px;

  /* hex geometry (7676767) — flat-top honeycomb */
  --hexWMain: 96px;
  --hexHMain: 84px;
  /* same-row spacing: point-to-point (full width between centers) */
  --hexStepX: var(--hexWMain);
  --hexGap: 0px;
  --hexOverlap: 0.0;
  /* grid footprint: 7 wide (point-to-point), 5.8 tall (with row overlap) */
  --hexGridWFactor: 7;
  --hexGridHFactor: 5.8;
  --hexAspect: 0.875; /* hexHMain / hexWMain */

  /* ✅ FIX: --hexW did not exist */
  --hexPitch: calc(var(--hexWMain) * (1 - var(--hexOverlap)) + var(--hexGap));

  --maxCols: 7;

  /* vertical center-to-center between row centers (flat-top honeycomb, -0.20 row-gap) */
  --hexStepY: calc(var(--hexHMain) * 0.80);

  /* height of JUST the 7 hex rows (no top/bottom padding) */
  --hexRowsH: calc((var(--hexStepY) * 6) + var(--hexHMain));

  /* height of rows + board padding */
  --hexFieldH: calc(var(--hexRowsH) + var(--boardPadTop) + var(--boardPadBottom));

  /* segment height should match a row block */
  --layerSegH: calc(var(--hexRowsH) / 7);
  --barH: 26px;

  /* side columns */
  --barColW: 86px;
  --barW: 26px;
  --sideColW: 340px;

  /* layer colors (overridden by themeVars inline) */
  --L1:#19ffb4;
  --L2:#67a5ff;
  --L3:#ffd36a;
  --L4:#ff7ad1;
  --L5:#a1ff5a;
  --L6:#a58bff;
  --L7:#ff5d7a;
}

*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  background: radial-gradient(1200px 900px at 50% 20%, rgba(60,80,180,.22), transparent 55%),
              radial-gradient(900px 650px at 20% 80%, rgba(120,255,210,.10), transparent 55%),
              var(--bg0);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  overflow:hidden;
}

.appRoot{
  min-height:100vh;
  position:relative;
}

.gameBg{
  position:absolute;
  inset:0;
  z-index:0;
  background-size: cover;
  background-position: center;
  opacity:1;
  filter: saturate(1.25) contrast(1.15) brightness(1.05);
}

/* =========================================================
   TOPBAR
========================================================= */
.topbar{
  height:64px;
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.08));
  backdrop-filter: blur(10px);
  position:relative;
  z-index:5;

  flex-wrap: nowrap;
  overflow: hidden;
}
.spacer{ flex:1; }

/* =========================================================
   PANELS / COMMON UI
========================================================= */
.screen.center{ height: calc(100vh - 64px); display:grid; place-items:center; padding:18px; }
.panel{
  width: min(980px, 92vw);
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 18px;
  backdrop-filter: blur(12px);
}
.panel.wide{ width:min(1040px, 94vw); }

.title{ font-size: 22px; font-weight: 900; letter-spacing: .3px; }
.sub{ margin-top:6px; color: var(--muted); font-size: 13px; }

.row{ display:flex; gap:10px; justify-content:flex-end; margin-top:14px; align-items:center; }
.hint{ margin-top:12px; color: var(--muted); font-size: 13px; }

.btn{
  border: 1px solid var(--stroke);
  background: rgba(255,255,255,.10);
  color: var(--text);
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.btn:hover{ background: rgba(255,255,255,.16); border-color: var(--stroke2); transform: translateY(-1px); }
.btn:active{ background: rgba(255,255,255,.22); transform: translateY(0); }
.btn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }

.btn.primary{
  background: rgba(120,220,255,.22);
  border-color: rgba(120,220,255,.35);
}
.btn.primary:hover{ background: rgba(120,220,255,.28); border-color: rgba(120,220,255,.50); }
.btn.primary:active{ background: rgba(120,220,255,.36); }

.grid{
  margin-top: 12px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}
@media (max-width: 700px){
  body{ overflow:auto; }
  .grid{ grid-template-columns: 1fr; }
}

.card{
  text-align: left;
  padding: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor: pointer;

  position: relative;
  border-radius: 22px;
  overflow: hidden;
  backface-visibility: hidden;
  will-change: transform;

  transition:
    transform 140ms ease,
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease;
}

.card:hover{
  transform: translateY(-1px);
  border-color: rgba(120,220,255,.35);
  background: rgba(0,0,0,.30);
  box-shadow: 0 14px 40px rgba(0,0,0,.32);
}

.card.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12), 0 16px 45px rgba(0,0,0,.42);
}

.cardTitle{ font-weight: 900; }
.cardDesc{ margin-top: 6px; color: var(--muted); font-size: 13px; }

.tracks{
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.tracksTitle{
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .4px;
}

.tracksRow{
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip{
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor: pointer;
}

.chip.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12);
}

/* =========================================================
   TOPBAR ITEMS
========================================================= */
.items{ display:flex; gap: 10px; flex-wrap: nowrap; }
.itemBtn{
  display:grid;
  grid-template-columns: 20px auto 18px;
  align-items:center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.itemBtn:hover{ background: rgba(0,0,0,.30); border-color: var(--stroke2); transform: translateY(-1px); }
.itemBtn:active{ transform: translateY(0); }
.itemBtn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }
.itemBtn.off{ opacity: .5; filter: grayscale(.2); }
.itemIcon{ font-size: 16px; line-height: 1; }
.itemName{ font-size: 12px; font-weight: 900; letter-spacing: .25px; }
.itemCharges{
  font-size: 12px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.08);
  text-align:center;
}

/* =========================================================
   DICE 3D
========================================================= */

.dice3d{
  --diceBox: 58px;
  --cube: 46px;
  --z: 23px;

  width: var(--diceBox);
  height: var(--diceBox);
  position: relative;
  display: grid;
  place-items: center;
  perspective: 700px;
}

.dice3d .cube{
  width: var(--cube);
  height: var(--cube);
  position: relative;
  transform-style: preserve-3d;
  transition: transform 180ms ease;
}

.dice3d.rolling .cube{ animation: cubeWobble .35s ease-in-out infinite; }

@keyframes cubeWobble{
  0%{ transform: rotateX(0deg) rotateY(0deg); }
  25%{ transform: rotateX(18deg) rotateY(-16deg); }
  50%{ transform: rotateX(-16deg) rotateY(22deg); }
  75%{ transform: rotateX(14deg) rotateY(16deg); }
  100%{ transform: rotateX(0deg) rotateY(0deg); }
}

.dice3d .face{
  position:absolute;
  inset:0;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35), 0 10px 22px rgba(0,0,0,.35);
  backface-visibility: hidden;
  transform: translateZ(var(--z));
}

.dice3d .face-front{  transform: rotateY(  0deg) translateZ(var(--z)); }
.dice3d .face-back{   transform: rotateY(180deg) translateZ(var(--z)); }
.dice3d .face-right{  transform: rotateY( 90deg) translateZ(var(--z)); }
.dice3d .face-left{   transform: rotateY(-90deg) translateZ(var(--z)); }
.dice3d .face-top{    transform: rotateX( 90deg) translateZ(var(--z)); }
.dice3d .face-bottom{ transform: rotateX(-90deg) translateZ(var(--z)); }

.dice3d.diceLg{
  --diceBox: 210px;
  --cube: 168px;
  --z: 84px;
  perspective: 1200px;
}

/* corners */
.diceCorner{
  position:absolute;
  width: 46%;
  aspect-ratio: 1 / 1;
  pointer-events:none;
  z-index: 5;

  background-image: var(--diceBorderUrl);
  background-repeat: no-repeat;
  background-size: contain;
  background-position: top left;

  opacity: 0.92;
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 10px rgba(255,60,0,.30));
}
.diceCorner.tl{ top: 0; left: 0; transform: rotate(0deg); }
.diceCorner.tr{ top: 0; right: 0; transform: rotate(90deg); }
.diceCorner.br{ bottom: 0; right: 0; transform: rotate(180deg); }
.diceCorner.bl{ bottom: 0; left: 0; transform: rotate(270deg); }

/* =========================================================
   GAME LAYOUT GRID
========================================================= */
.gameLayout{
  position: relative;
  z-index: 3;
  height: calc(100vh - 64px);
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  padding: 14px;
  grid-template-rows: 1fr;
  min-height: 0;
  opacity: 1;
}

.playColumn{
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr var(--sideColW);
  grid-template-rows: 1fr;
  gap: 14px;
}

/* =========================================================
   LAYER BARS
========================================================= */
.barWrap{
  z-index: 6;
}
.barWrap.barLeft{
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--boardPadTop);
  padding-bottom: var(--boardPadBottom);
}
.barLeft{ justify-content: flex-start; }

.barWrap.barTop{
  grid-column: 1 / -1;
  grid-row: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px 6px;
}

.layerBar{
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.18);
  box-shadow: 0 18px 40px rgba(0,0,0,.35);
  display: flex;
  position: relative;
}

.layerBar.layerBarHorizontal{
  width: min(100%, calc(var(--hexStepX) * var(--maxCols)));
  height: var(--barH);
  flex-direction: row;
}

.layerBar.rowShiftBar{
  width: var(--barW);
  height: var(--hexRowsH);
  flex-direction: column;
}

.barSeg{ opacity: .95; }
.layerBarHorizontal .barSeg{
  flex: 1 1 0;
  width: auto;
  height: 100%;
  min-width: 0;
}
.rowShiftBar .barSeg{
  height: var(--layerSegH);
  width: 100%;
}
.barSeg[data-layer="7"]{ background: var(--L7); }
.barSeg[data-layer="6"]{ background: var(--L6); }
.barSeg[data-layer="5"]{ background: var(--L5); }
.barSeg[data-layer="4"]{ background: var(--L4); }
.barSeg[data-layer="3"]{ background: var(--L3); }
.barSeg[data-layer="2"]{ background: var(--L2); }
.barSeg[data-layer="1"]{ background: var(--L1); }

.barSeg.isActive{
  filter: brightness(1.15);
  box-shadow:
    inset 0 0 0 2px rgba(255,255,255,.42),
    0 0 18px 6px rgba(255,255,255,.10);
  position: relative;
}

.rowShiftBar{ position: relative; }
.rowShiftBar .rowSeg{
  height: var(--layerSegH);
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.03);
}
.rowShiftLabel{
  font-weight: 1000;
  font-size: 12px;
  letter-spacing: .35px;
  color: rgba(255,255,255,.88);
  text-shadow: 0 2px 10px rgba(0,0,0,.45);
  user-select: none;
}

.goalMarker{
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 1000;
  font-size: 12px;
  letter-spacing: .2px;
  color: rgba(255, 220, 120, .95);
  background: rgba(0,0,0,.45);
  border: 1px solid rgba(255, 220, 120, .55);
  box-shadow:
    0 10px 22px rgba(0,0,0,.45),
    0 0 0 3px rgba(255, 220, 120, .10);
  z-index: 5;
  pointer-events: none;
}

.barPlayerMini{
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.18);
  box-shadow:
    0 10px 22px rgba(0,0,0,.40),
    0 0 0 3px rgba(255,255,255,.06);
  pointer-events: none;
  z-index: 4;
}

.barPlayerMini .miniSprite{
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
  background-image: var(--spriteImg);
  background-repeat: no-repeat;
  background-size:
    calc(var(--frameW) * var(--cols) * 1px)
    calc(var(--frameH) * var(--rows) * 1px);
  background-position:
    calc(var(--frameW) * -1px * var(--frameX))
    calc(var(--frameH) * -1px * var(--frameY));
  transform: scale(0.22);
  transform-origin: center;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,.55));
}

/* =========================================================
   BOARD WRAP
========================================================= */
.boardWrap{
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.50);
  box-shadow: var(--shadow2);
  overflow: hidden;
  --boardInset: calc((100% - var(--barColW) - var(--boardW)) / 2);
  display: grid;
  grid-template-columns: var(--barColW) 1fr;
  grid-template-rows: auto 1fr;
  align-items: stretch;
  opacity: 1;
  height: 100%;
  min-height: 0;
}

.boardLayerBg{
  position:absolute; inset:0;
  background-size: cover;
  background-position: center;
  opacity: 1;
  transform: scale(1.02);
  animation: bgFadeIn 220ms ease;
  z-index: 1;
}
@keyframes bgFadeIn{
  from{ opacity: 0; }
  to{ opacity: .45; }
}

.boardScroll{
  grid-column: 2;
  grid-row: 2;
  position: relative;
  z-index: 3;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.barWrap.barLeft{ grid-column: 1; grid-row: 2; }

.board{
  width: calc(var(--hexStepX) * var(--maxCols));
  margin: 0 auto;
  padding: var(--boardPadTop) 0 var(--boardPadBottom);
  position: relative;
  height: var(--hexFieldH);
  overflow: visible;
}

/* =========================================================
   HEX GRID (7676767) — shared 14-col honeycomb grid
========================================================= */
.hexGrid{
  display: grid;
  grid-template-columns: repeat(14, calc(var(--hexStepX) / 2));
  width: calc(var(--hexStepX) * var(--maxCols));
  grid-auto-rows: var(--hexHMain);
  row-gap: calc(var(--hexHMain) * -0.20);
  margin: 0 auto;
  position: relative;
}

.hexRow{
  display: contents;
}

/* =========================================================
   HEX SLOTS + HEX BUTTON
========================================================= */
.hexSlot{
  width: 100%;
  height: var(--hexHMain);
  display: grid;
  place-items: center;
  position: relative;
  overflow: visible;
}
.hexSlot.empty{ opacity: 0; }

.hex{
  width: var(--hexWMain);
  height: var(--hexHMain);

  /* ✅ FIX: spacing is controlled by .hexSlot; remove old flex-era margin hacks */
  margin: 0;

  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  padding: 0;
  border: 0;
  background: rgba(255,255,255,.14);
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0,0,0,.35) inset, 0 6px 16px rgba(0,0,0,.10);
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.35));
  transition: transform 140ms ease, filter 140ms ease;
  position: relative;
  z-index: 1;
  overflow: visible;
  --hexGlow: rgba(120,255,210,.51);
}
.hex:hover{
  transform: translateY(-2px);
  filter: drop-shadow(0 14px 22px rgba(0,0,0,.45));
}
.hex:disabled{
  opacity: .75;
  cursor: not-allowed;
  transform:none;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.25));
}

/* =========================================================
   HEX INNER TILE + STATES
========================================================= */
.hexAnchor{ position: relative; width: 100%; height: 100%; overflow: visible; }

.hexInner{
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  border: 1px solid rgba(255,255,255,.12);
  /* PNG art via --tileArt; gradients below remain as fallback if image is absent or fails */
  background-image:
    var(--tileArt, none),
    radial-gradient(circle at 30% 25%, rgba(120,255,210,.12), transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(120,150,255,.12), transparent 55%);
  background-color: rgba(0,0,0,.34);
  background-size: cover, auto, auto;
  background-position: center, center, center;
  background-repeat: no-repeat, no-repeat, no-repeat;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35);
  overflow:visible;
}

.hexCoords{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 14;
}

.hexId{
  font-size: calc(var(--hexWMain) * 0.26);
  font-weight: 900;
  color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    -1.5px -1.5px 0 #000,
     1.5px -1.5px 0 #000,
    -1.5px  1.5px 0 #000,
     1.5px  1.5px 0 #000,
     0 -1.5px 0 #000,
     0  1.5px 0 #000,
    -1.5px  0   0 #000,
     1.5px  0   0 #000;
}

.hexMarks{
  position:absolute;
  right: 9px;
  bottom: 9px;
  display:flex;
  gap: 6px;
  align-items: flex-end;
  z-index: 20;
}
.mark{
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display:grid;
  place-items:center;
  font-weight: 900;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  color: rgba(60, 163, 255, 0.8);
}
.mark.g{
  border-color: rgba(255,211,106,.35);
  color: rgba(255,211,106,.95);
  background: rgba(255,211,106,.10);
}
.mark.t{
  border-color: rgba(255,122,209,.35);
  color: rgba(255,122,209,.95);
  background: rgba(255,122,209,.10);
}

/* =========================================================
   REACHABLE HEX HIGHLIGHT
========================================================= */
.hex.reach .hexInner{
  position: relative;
  border-color: color-mix(in srgb, var(--hexGlow) 90%, white 10%);
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.4);
}

.hex.reach .hexInner::after{
  content:"";
  position:absolute;
  inset: 1px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  padding: 6px;
  pointer-events:none;
  background:
    conic-gradient(
      from var(--reachSpin),
      color-mix(in srgb, var(--hexGlow) 0%, transparent) 0deg,
      color-mix(in srgb, var(--hexGlow) 35%, transparent) 40deg,
      color-mix(in srgb, var(--hexGlow) 100%, transparent) 90deg,
      color-mix(in srgb, var(--hexGlow) 35%, transparent) 140deg,
      color-mix(in srgb, var(--hexGlow) 0%, transparent) 210deg,
      color-mix(in srgb, var(--hexGlow) 0%, transparent) 360deg
    );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 1;
  filter:
    drop-shadow(0 0 10px color-mix(in srgb, var(--hexGlow) 95%, transparent))
    drop-shadow(0 0 22px color-mix(in srgb, var(--hexGlow) 35%, transparent));
  animation:
    reachSpin 1.8s linear infinite,
    reachPulse .9s ease-in-out infinite;
  transform: translateZ(0);
  will-change: transform;
}

@property --reachSpin {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes reachSpin {
  to { --reachSpin: 360deg; }
}

@keyframes reachPulse {
  0%,100% { opacity: .85; }
  50%     { opacity: 1; }
}

.hex.reach{
  filter:
    drop-shadow(0 12px 18px rgba(0,0,0,.40))
    drop-shadow(0 0 10px color-mix(in srgb, var(--hexGlow) 55%, transparent));
}

/* =========================================================
   START PORTAL FX
========================================================= */
.hex.portalStart,
.hex.portalUp,
.hex.portalDown{
  --portalC: var(--hexGlow);
  z-index: 4;
  filter:
    drop-shadow(0 10px 16px rgba(0,0,0,.35))
    drop-shadow(0 0 18px color-mix(in srgb, var(--portalC) 55%, transparent))
    drop-shadow(0 0 34px color-mix(in srgb, var(--portalC) 30%, transparent));
}

.portalFx{
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 12;
  overflow: visible;
}

.portalFx::before{
  content: "";
  position: absolute;
  inset: 0;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  background:
    radial-gradient(circle at 50% 45%,
      rgba(0,0,0,.18),
      rgba(0,0,0,.62) 72%);
  z-index: 0;
}

.hex .hexInner .pAura,
.hex .hexInner .pRunes,
.hex .hexInner .pVortex,
.hex .hexInner .pWell,
.hex .hexInner .pShine,
.hex .hexInner .pOrbs,
.hex .hexInner .pRim,
.hex .hexInner .pOval{
  position:absolute;
  pointer-events:none;
}

.hex .hexInner .pRunes,
.hex .hexInner .pVortex,
.hex .hexInner .pWell,
.hex .hexInner .pShine,
.hex .hexInner .pOrbs{
  inset:0;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  z-index: 2;
}

.hex.portalStart .hexInner,
.hex.portalUp .hexInner,
.hex.portalDown .hexInner{
  border-color: color-mix(in srgb, var(--portalC) 70%, rgba(255,255,255,.18));
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    inset 0 0 28px color-mix(in srgb, var(--portalC) 28%, transparent),
    0 0 0 3px color-mix(in srgb, var(--portalC) 28%, transparent),
    0 0 22px color-mix(in srgb, var(--portalC) 38%, transparent);
}

.hex.portalStart .hexInner .pAura,
.hex.portalUp .hexInner .pAura,
.hex.portalDown .hexInner .pAura{
  inset:-22%;
  border-radius: 999px;
  clip-path: none;
  z-index: 1;
  background:
    radial-gradient(circle at 50% 50%,
      color-mix(in srgb, var(--portalC) 85%, transparent),
      transparent 58%),
    radial-gradient(circle at 60% 78%,
      rgba(0,255,195,0.28),
      transparent 64%);
  filter: blur(10px) saturate(1.35);
  opacity: 1;
  animation: portalBreathe 2.6s ease-in-out infinite;
}
@keyframes portalBreathe{
  0%,100%{ transform: scale(0.99); filter: blur(10px) saturate(1.2); }
  50%{ transform: scale(1.14); filter: blur(14px) saturate(1.45); }
}

.hex.portalStart .hexInner .pVortex{
  inset: 6%;
  overflow:hidden;
  filter: saturate(1.35);
  opacity: 1;
  z-index: 4;
}
.hex.portalStart .hexInner .pVortex::before{
  content:"";
  position:absolute; inset:-25%;
  background:
    conic-gradient(from 0deg,
      rgba(0,0,0,0) 0 10%,
      color-mix(in srgb, var(--portalC) 85%, transparent) 18%,
      rgba(0,255,195,0.35) 28%,
      rgba(255,80,170,0.24) 40%,
      color-mix(in srgb, var(--portalC) 65%, transparent) 54%,
      rgba(0,0,0,0) 70% 100%),
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0.0) 0 38%,
      rgba(0,0,0,0.82) 64% 100%);
  mix-blend-mode: screen;
  animation: portalVortex 1.45s linear infinite;
}
@keyframes portalVortex{
  0%{ transform: rotate(0deg) scale(1.03); }
  100%{ transform: rotate(360deg) scale(1.03); }
}

.hex.portalStart .hexInner .pRunes{
  inset: 2%;
  opacity: 0.95;
  z-index: 5;
  background:
    repeating-conic-gradient(
      from 10deg,
      rgba(255,255,255,0.0) 0 10deg,
      color-mix(in srgb, var(--portalC) 70%, transparent) 10deg 12deg,
      rgba(255,255,255,0.0) 12deg 18deg
    );
  filter: blur(0.35px);
  animation: portalRunes 3.4s linear infinite reverse;
  mix-blend-mode: screen;
}
@keyframes portalRunes{
  0%{ transform: rotate(0deg); }
  100%{ transform: rotate(360deg); }
}

.hex.portalStart .hexInner .pWell{
  inset: 22%;
  z-index: 3;
  background:
    radial-gradient(circle at 50% 52%,
      rgba(0,0,0,0.0) 0 30%,
      rgba(0,0,0,0.92) 68% 100%),
    radial-gradient(circle at 45% 40%,
      rgba(255,255,255,0.18),
      transparent 55%);
  opacity: 1;
}

.hex.portalStart .hexInner .pShine{
  inset:-20%;
  z-index: 6;
  clip-path: none;
  background:
    conic-gradient(from 210deg,
      transparent 0 45%,
      rgba(255,255,255,0.28) 48%,
      transparent 52% 100%);
  opacity:0.55;
  mix-blend-mode: screen;
  animation: portalShine 1.6s linear infinite;
}
@keyframes portalShine{
  0%{ transform: rotate(0deg); }
  100%{ transform: rotate(360deg); }
}

/* =========================================================
   PORTAL TILE FX (uses destination color: --portalC)
========================================================= */
.hex.portalUp .hexInner .pOrbs,
.hex.portalDown .hexInner .pOrbs{
  inset: 0;
  z-index: 3;
  background:
    radial-gradient(8px 7px at 20% 30%, rgba(255,255,255,0.28), transparent 58%),
    radial-gradient(9px 8px at 35% 22%, color-mix(in srgb, var(--portalC) 55%, transparent), transparent 58%),
    radial-gradient(8px 7px at 55% 18%, rgba(0,255,220,0.28), transparent 58%),
    radial-gradient(9px 8px at 72% 26%, color-mix(in srgb, var(--portalC) 45%, transparent), transparent 58%);
  mix-blend-mode: screen;
  filter: blur(0.2px);
  opacity: 1;
  animation: pOrbs 3.2s ease-in-out infinite;
}
@keyframes pOrbs{
  0%,100%{ transform: translateY(0); opacity:.85; }
  50%{ transform: translateY(-6px); opacity:1; }
}

.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval,
.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim{
  left:50%;
  top:50%;
  width: 88%;
  height: 52%;
  clip-path: none;
  z-index: 5;
  transform:
    translate(-50%,-50%)
    rotate(-18deg)
    skewX(-10deg)
    perspective(800px)
    rotateX(60deg);
  border-radius: 999px;
}

.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval{
  inset: auto;
  overflow:visible;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0) 0 34%,
      rgba(0,0,0,0.92) 68%),
    radial-gradient(circle at 45% 50%,
      color-mix(in srgb, var(--portalC) 55%, transparent),
      transparent 62%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 0 18px color-mix(in srgb, var(--portalC) 45%, transparent);
}
.hex.portalUp .hexInner .pOval::before,
.hex.portalDown .hexInner .pOval::before{
  content:"";
  position:absolute;
  inset:-32%;
  background:
    conic-gradient(
      rgba(0,0,0,0) 0 14%,
      color-mix(in srgb, var(--portalC) 100%, transparent) 22%,
      rgba(0,255,220,0.32) 32%,
      rgba(255,80,170,0.20) 44%,
      color-mix(in srgb, var(--portalC) 75%, transparent) 58%,
      rgba(0,0,0,0) 72% 100%);
  mix-blend-mode: screen;
  animation: pSpin 1.25s linear infinite;
}
@keyframes pSpin{ to{ transform: rotate(360deg); } }

.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim{
  inset:auto;
  z-index: 6;
  background:
    conic-gradient(
      transparent 0 18%,
      rgba(255,255,255,0.32) 22%,
      color-mix(in srgb, var(--portalC) 100%, transparent) 32%,
      transparent 55% 100%);
  filter: blur(0.4px);
  mix-blend-mode: screen;
  animation: pRim 1.55s linear infinite;
}
@keyframes pRim{
  to{
    transform:
      translate(-50%,-50%)
      rotate(-18deg)
      skewX(-10deg)
      perspective(800px)
      rotateX(60deg)
      rotate(360deg);
  }
}

/* =========================================================
   GHOST GRID (unshifted reference)
========================================================= */
.ghostGrid{
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  opacity: 0.35;
  display: grid;
  grid-template-columns: repeat(14, calc(var(--hexStepX) / 2));
  grid-auto-rows: var(--hexHMain);
  row-gap: calc(var(--hexHMain) * -0.20);
}

.ghostRow{
  display: contents;
}

.ghostSlot{
  width: 100%;
  height: var(--hexHMain);
  display: grid;
  place-items: center;
}

.ghostHex{
  width: var(--hexWMain);
  height: var(--hexHMain); /* ✅ FIX: match real hex height */
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  border: 1px dashed rgba(255,255,255,.35);
  background: rgba(0,0,0,.12);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
}

/* =========================================================
   SPRITE
========================================================= */
.playerSpriteSheet{
  position: absolute;
  left: 50%;
  top: 86%;
  width: calc(var(--frameW) * 1px);
  height: calc(var(--frameH) * 1px);

  --spriteScale: 0.78;
  --footX: -10px;
  --footY: 0px;

  transform:
    translate(calc(-50% + var(--footX)), calc(-100% + var(--footY)))
    scale(var(--spriteScale));
  transform-origin: 50% 100%;

  z-index: 20;
  pointer-events: none;
  image-rendering: pixelated;

  background-image: var(--spriteImg);
  background-repeat: no-repeat;
  background-size:
    calc(var(--frameW) * var(--cols) * 1px)
    calc(var(--frameH) * var(--rows) * 1px);
  background-position:
    calc(var(--frameW) * -1px * var(--frameX))
    calc(var(--frameH) * -1px * var(--frameY));

  filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
}

/* =========================================================
   SIDEBAR (STATUS + LOG)
========================================================= */
.side{
  display:grid;
  grid-auto-rows: min-content;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}
.panelMini{
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(10,14,24,.88);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(10px);
}
.miniTitle{
  margin: 0 0 10px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .45px;
  color: rgba(255,255,255,.82);
  font-weight: 900;
}
.miniRow{
  display:flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(255,255,255,.08);
}
.miniRow:last-child{ border-bottom: none; }
.miniRow .k{ color: var(--muted); font-size: 12px; }
.miniRow .v{ font-weight: 900; font-size: 12px; }

.log{ max-height: 340px; overflow:auto; padding-right: 6px; }
.logRow{
  display:grid;
  grid-template-columns: 58px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.logRow:last-child{ border-bottom:none; }
.lt{ color: rgba(255,255,255,.55); font-size: 12px; font-variant-numeric: tabular-nums; }
.lm{ font-size: 13px; color: rgba(255,255,255,.88); }
.logRow.ok .lm{ color: rgba(70,249,180,.92); }
.logRow.bad .lm{ color: rgba(255,93,122,.92); }
.logRow.info .lm{ color: rgba(119,168,255,.92); }

/* =========================================================
   DECK CARDS
========================================================= */

.hexDeckOverlay{
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;

  --cardGlow: rgba(120,255,210,.65);
  --deckPadX: 14px;
  --deckPadY: 14px;
}

.hexDeckCol{ display: contents; }

.hexDeckCard{
  position: absolute;

  width: clamp(187px, 18vw, 286px);
  max-width: max(150px, calc(var(--boardInset) - (var(--deckPadX) * 2)));

  aspect-ratio: 3 / 4;
  border-radius: 22px;
  overflow: hidden;

  isolation: isolate;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;

  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(135deg, var(--a), var(--b));
  box-shadow:
    0 18px 48px rgba(0,0,0,.55),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

.hexDeckCard.cosmic{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(-45%);
}
.hexDeckCard.risk{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(-45%);
}
.hexDeckCard.terrain{
  right: calc(var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(45%);
}
.hexDeckCard.shadow{
  right: calc(var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(45%);
}

.hexDeckCard .deckFx{
  position:absolute;
  inset:0;
  border-radius: inherit;
  pointer-events:none;
  overflow:hidden;
  transform: translateZ(0);
}

.hexDeckCard .deckFx::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;

  background:
    radial-gradient(120% 90% at 40% 20%,
      color-mix(in srgb, var(--a) 35%, white 10%),
      transparent 60%),
    radial-gradient(90% 70% at 70% 80%,
      color-mix(in srgb, var(--b) 35%, white 6%),
      transparent 60%),
    linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px) 0 0 / 18px 16px,
    linear-gradient(30deg, rgba(0,0,0,.20) 1px, transparent 1px) 0 0 / 18px 16px,
    linear-gradient(150deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 18px 16px;

  opacity: .55;
  mix-blend-mode: overlay;
}

@keyframes deckInnerDrift{
  from { transform: translate3d(-90%,-90%,0) rotate(0deg); }
  to   { transform: translate3d( 90%, 90%,0) rotate(360deg); }
}

.hexDeckCard .deckFx::after{
  content:"";
  position:absolute;
  inset:-25%;
  border-radius: inherit;

  background:
    repeating-linear-gradient(
      115deg,
      rgba(255,255,255,0) 0px,
      rgba(255,255,255,0) 10px,
      rgba(255,255,255,.18) 14px,
      rgba(255,255,255,0) 18px
    ),
    repeating-linear-gradient(
      25deg,
      rgba(0,0,0,0) 0px,
      rgba(0,0,0,0) 12px,
      color-mix(in srgb, var(--b) 25%, transparent) 16px,
      rgba(0,0,0,0) 22px
    );

  background-size: 180% 180%;
  opacity: .38;
  mix-blend-mode: screen;

  will-change: transform;
  animation: deckInnerDrift 8s linear infinite;
}

@property --spin {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes deckBorderSpin{
  to { --spin: 360deg; }
}

@keyframes deckBorderBreath{
  0%,100%{
    opacity:.95;
    filter: drop-shadow(0 0 10px var(--cardGlow));
  }
  50%{
    opacity:1;
    filter: drop-shadow(0 0 16px var(--cardGlow));
  }
}

.hexDeckCard::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;
  padding: 2px;
  pointer-events:none;

  background:
    conic-gradient(
      from var(--spin),
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 0deg,
      color-mix(in srgb, var(--cardGlow) 65%, rgba(255,255,255,.10)) 90deg,
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 180deg,
      color-mix(in srgb, var(--cardGlow) 65%, rgba(255,255,255,.10)) 270deg,
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 360deg
    );

  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;

  animation:
    deckBorderSpin 2.8s linear infinite,
    deckBorderBreath 1.35s ease-in-out infinite;
}

.cardBadge{
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 22;
}

.hexSlot > .cardBadge.hexDeckCard{
  position: absolute;
  left: 50%;
  top: 0;
  right: auto;
  bottom: auto;
  /* match mobile deck row: 42×56 portrait, radius 10 */
  width: calc(var(--hexWMain) * 0.55 * 3 / 4);
  height: calc(var(--hexWMain) * 0.55);
  max-width: none;
  aspect-ratio: unset;
  transform: translate(-50%, -50%);
  border-radius: calc(var(--hexWMain) * 0.55 * 10 / 56);
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(135deg, var(--a), var(--b));
  box-shadow:
    0 8px 18px rgba(0,0,0,.45),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

.hexSlot > .cardBadge.hexDeckCard.cosmic,
.hexSlot > .cardBadge.hexDeckCard.risk,
.hexSlot > .cardBadge.hexDeckCard.terrain,
.hexSlot > .cardBadge.hexDeckCard.shadow{
  left: 50%;
  top: 0;
  right: auto;
  bottom: auto;
  transform: translate(-50%, -50%);
}

.cardBadge .deckFx{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

/* hex card markers reuse hexDeckCard theme vars */
.hexDeckCard.cosmic  { --a:#0C1026; --b:#1A1F4A; }
.hexDeckCard.risk    { --a:#12090A; --b:#6E0F1B; }
.hexDeckCard.terrain { --a:#0E3B2E; --b:#1FA88A; }
.hexDeckCard.shadow  { --a:#1B1B1E; --b:#2A1E3F; }

/* Mobile deck row (below board) */
.mobileDeckRow{
  display: none;
  gap: 8px;
  padding: 0 2px;
  justify-content: space-between;
  align-items: center;
}

.mobileDeckRow .mobileDeckCard{
  position: relative;
  flex: 0 0 calc(56px * 3 / 4);
  width: calc(56px * 3 / 4);
  height: 56px;
  max-width: calc(56px * 3 / 4);
  max-height: 56px;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  isolation: isolate;
  left: auto;
  right: auto;
  top: auto;
  bottom: auto;
  margin: 0;
  transform: none;
}

.mobileDeckRow .mobileDeckCard.cosmic,
.mobileDeckRow .mobileDeckCard.risk,
.mobileDeckRow .mobileDeckCard.terrain,
.mobileDeckRow .mobileDeckCard.shadow{
  transform: none;
}

.mobileDeckCard .deckFx{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

.statusGrid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

/* =========================================================
   CARD FLIP OVERLAY (FULLSCREEN)
========================================================= */

.cardFlipOverlay{
  --flipDur: 1400ms;

  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(10px);
  pointer-events: none;
  animation: cardFlipFade var(--flipDur) ease-out forwards;
}

@keyframes cardFlipFade{
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}

.cardFlipCard{
  width: min(420px, 78vw);
  aspect-ratio: 3 / 4;
  border-radius: 28px;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow:
    0 28px 90px rgba(0,0,0,.65),
    0 0 0 1px rgba(255,255,255,.06) inset;
  overflow: hidden;
  position: relative;
  transform-origin: center;
  animation: cardFlipPop var(--flipDur) ease-out forwards;
}

@keyframes cardFlipPop{
  0%   { transform: translateY(18px) scale(.92) rotateX(12deg); filter: blur(2px); opacity: 0; }
  12%  { transform: translateY(0)    scale(1)  rotateX(0deg);  filter: blur(0);  opacity: 1; }
  70%  { transform: translateY(0)    scale(1)  rotateX(0deg);  filter: blur(0);  opacity: 1; }
  100% { transform: translateY(-10px) scale(.98); filter: blur(1px); opacity: 0; }
}

.cardFlipCard.cosmic  { background: linear-gradient(135deg,#0C1026,#1A1F4A); }
.cardFlipCard.risk    { background: linear-gradient(135deg,#12090A,#6E0F1B); }
.cardFlipCard.terrain { background: linear-gradient(135deg,#0E3B2E,#1FA88A); }
.cardFlipCard.shadow  { background: linear-gradient(135deg,#1B1B1E,#2A1E3F); }

.cardFlipCard::before{
  content:"";
  position:absolute;
  inset:-30%;
  background:
    radial-gradient(80% 60% at 30% 20%, rgba(255,255,255,.14), transparent 65%),
    radial-gradient(70% 55% at 75% 80%, rgba(255,255,255,.10), transparent 65%),
    repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 14px, rgba(255,255,255,.10) 18px, rgba(255,255,255,0) 22px);
  opacity: .55;
  mix-blend-mode: overlay;
  animation: flipDrift var(--flipDur) linear forwards;
}

@keyframes flipDrift{
  from { transform: translate3d(-12%, -10%, 0) rotate(0deg); }
  to   { transform: translate3d( 12%,  10%, 0) rotate(14deg); }
}

.cardFlipCard::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;
  padding: 2px;
  pointer-events:none;
  background:
    conic-gradient(
      from 0deg,
      rgba(255,255,255,.28),
      rgba(255,255,255,.08),
      rgba(255,255,255,.28)
    );

  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  opacity: .9;
}

.cardFlipLabel{
  position:absolute;
  left: 18px;
  bottom: 16px;
  font-weight: 1000;
  letter-spacing: .45px;
  font-size: 13px;
  color: rgba(255,255,255,.90);
  text-transform: uppercase;
  text-shadow: 0 10px 26px rgba(0,0,0,.55);
}

.cardFlipVillain{
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 5;
  opacity: 0;
  animation: villainFadeIn 700ms ease-out forwards;
  animation-delay: 350ms;
  filter: drop-shadow(0 18px 40px rgba(0,0,0,.55));
}

@keyframes villainFadeIn{
  from { opacity: 0; transform: scale(1.02); }
  to   { opacity: 1; transform: scale(1.00); }
}

/* Risk Step B: pop like blue, flip to villain, controls below */
.cardFlipOverlay.riskEncounter{
  --flipDur: 1400ms;
  background: rgba(0,0,0,.80);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  animation: riskOverlayIn 320ms ease-out forwards;
}

@keyframes riskOverlayIn{
  from { opacity: 0; }
  to   { opacity: 1; }
}

.riskEncounterStack{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: min(420px, 92vw);
}

.cardFlipCard.riskReveal{
  width: min(420px, 78vw);
  aspect-ratio: 3 / 4;
  border-radius: 28px;
  position: relative;
  transform-style: preserve-3d;
  transform-origin: center;
  animation: riskCardPopThenFlip var(--flipDur) ease-out forwards;
  overflow: visible;
  background: transparent;
  border: none;
  box-shadow: none;
}

.cardFlipCard.riskReveal::before,
.cardFlipCard.riskReveal::after{
  display: none;
}

@keyframes riskCardPopThenFlip{
  0%   { transform: translateY(18px) scale(.92) rotateY(0deg); opacity: 0; }
  12%  { transform: translateY(0)    scale(1)  rotateY(0deg); opacity: 1; }
  62%  { transform: translateY(0)    scale(1)  rotateY(0deg); opacity: 1; }
  100% { transform: translateY(0)    scale(1)  rotateY(180deg); opacity: 1; }
}

.cardFlipFace{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  backface-visibility: hidden;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow:
    0 28px 90px rgba(0,0,0,.65),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

.cardFlipFace.front{
  background: linear-gradient(135deg,#12090A,#6E0F1B);
  transform: rotateY(0deg);
}

.cardFlipFace.back{
  transform: rotateY(180deg);
  background: #000;
}

.cardFlipFace.back img{
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.riskEncounterControls{
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  opacity: 0;
  pointer-events: none;
  animation: riskControlsIn 420ms ease-out 1.05s forwards;
}

@keyframes riskControlsIn{
  to{
    opacity: 1;
    pointer-events: auto;
  }
}

.riskEncounterControls .encounterActionRow{
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.riskEncounterControls .encounterInfo{
  text-align: center;
}

/* =========================================================
   FLY-OUT CARD (deck -> center -> flip)
========================================================= */
.flyCardOverlay{
  position: fixed;
  inset: 0;
  z-index: 1900;
  pointer-events: none;
}

.flyCard{
  position: fixed;
  left: 0;
  top: 0;

  width: var(--fromW);
  height: var(--fromH);

  transform-style: preserve-3d;
  transform-origin: center;
  border-radius: var(--fromRadius, 10px);
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(255,255,255,.18);

  transform: translate3d(var(--fromX), var(--fromY), 0) scale(1);

  animation: flyToCenter 1.15s ease-out forwards;
  box-shadow: 0 8px 18px rgba(0,0,0,.45);
}

.flyCard .deckFx{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transform: translateZ(0);
}

.flyCard.cosmic  { background: linear-gradient(135deg,#0C1026,#1A1F4A); }
.flyCard.risk    { background: linear-gradient(135deg,#12090A,#6E0F1B); }
.flyCard.terrain { background: linear-gradient(135deg,#0E3B2E,#1FA88A); }
.flyCard.shadow  { background: linear-gradient(135deg,#1B1B1E,#2A1E3F); }

.flyFace{
  position:absolute;
  inset:0;
  backface-visibility: hidden;
  border-radius: inherit;
  overflow:hidden;
}
.flyFront{ transform: rotateY(0deg); }
.flyBack{
  transform: rotateY(180deg);
  filter: brightness(1.05) saturate(1.1);
}

.flyLabel{
  position:absolute;
  left: 18px;
  bottom: 16px;
  font-weight: 1000;
  letter-spacing: .45px;
  font-size: 13px;
  color: rgba(255,255,255,.92);
  text-transform: uppercase;
  text-shadow: 0 10px 26px rgba(0,0,0,.55);
}

@keyframes flyToCenter{
  0%{
    opacity: 1;
    transform: translate3d(var(--fromX), var(--fromY), 0)
               scale(1)
               rotateY(0deg);
  }

  45%{
    opacity: 1;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(0deg);
  }

  70%{
    opacity: 1;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(0deg);
  }

  85%{
    opacity: 1;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(180deg);
  }

  100%{
    opacity: 0;
    transform:
      translate3d(
        calc(50vw - (var(--fromW) / 2)),
        calc(50vh - (var(--fromH) / 2)),
        0
      )
      scale(1)
      rotateY(180deg);
  }
}

/* =========================================================
   ENCOUNTER SCENE
========================================================= */
.encounterScene{
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.62);
  backdrop-filter: blur(10px);
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

.encounterGrid{
  width: min(1200px, 94vw);
  display: grid;
  grid-template-columns: minmax(280px, 480px) 1fr;
  gap: 48px;
  align-items: center;
}

.encounterCard{
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: min(72vh, 640px);
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 28px 90px rgba(0,0,0,.65);
  background: rgba(0,0,0,.25);
}

.encounterCard.riskCard {
  background: linear-gradient(135deg,#12090A,#6E0F1B);
  position: relative;
  overflow: hidden;
}

.riskCardFx {
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(80% 60% at 30% 20%, rgba(255,255,255,.12), transparent 65%),
    radial-gradient(70% 55% at 75% 80%, rgba(255,255,255,.08), transparent 65%);
  mix-blend-mode: overlay;
  animation: riskDrift 8s linear infinite;
}

@keyframes riskDrift {
  from { transform: translate3d(-12%, -10%, 0) rotate(0deg); }
  to   { transform: translate3d( 12%,  10%, 0) rotate(14deg); }
}

.riskVillainImg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 5;
  animation: villainFadeIn 700ms ease-out forwards;
  animation-delay: 300ms;
  filter: drop-shadow(0 18px 40px rgba(0,0,0,.55));
}

.encounterRight{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.encounterActionRow{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.encounterInfo{
  text-align: center;
  width: min(520px, 100%);
}

.encounterButtons{
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 12px;
}

.encounterTitle{
  font-size: 20px;
  font-weight: 1000;
  letter-spacing: .45px;
  text-transform: uppercase;
}

.encounterSub{
  margin-top: 8px;
  font-size: 14px;
  color: rgba(255,255,255,.82);
}

.encounterTries{
  display: inline-block;
  margin-left: 12px;
  opacity: .85;
}

.encounterRollPill{
  margin-top: 12px;
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.25);
  font-weight: 900;
}

@media (max-width: 860px){
  .encounterScene{
    place-items: start center;
    align-content: start;
    padding: 10px 10px 24px;
  }

  .encounterGrid{
    grid-template-columns: 1fr;
    gap: 12px;
    width: 100%;
    max-width: 100%;
    margin: auto 0;
  }

  .encounterCard{
    aspect-ratio: 16 / 10;
    max-height: 34vh;
    min-height: 120px;
    border-radius: 18px;
  }

  .encounterRight{
    align-items: stretch;
    width: 100%;
  }

  .encounterActionRow{
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
    gap: 12px;
  }

  .dice3d.diceLg{
    --diceBox: 88px;
    --cube: 70px;
    --z: 35px;
    perspective: 700px;
    flex: 0 0 auto;
    margin-top: 4px;
  }

  .encounterInfo{
    text-align: left;
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .encounterTitle{
    font-size: 16px;
  }

  .encounterSub{
    font-size: 12px;
    line-height: 1.35;
  }

  .encounterTries{
    display: block;
    margin-left: 0;
    margin-top: 4px;
  }

  .encounterButtons{
    justify-content: flex-start;
    margin-top: 10px;
    gap: 8px;
  }

  .encounterButtons .btn{
    padding: 9px 14px;
    font-size: 14px;
    border-radius: 12px;
  }

  .encounterRollPill{
    margin-top: 8px;
    font-size: 12px;
    padding: 6px 10px;
  }
}

@media (max-width: 980px){
  body{ overflow:hidden; }
  .appRoot.game{
    height: 100dvh;
    overflow: hidden;
  }

  .topbar{
    height: 52px;
    padding: 6px 8px;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .itemBtn{ padding: 6px 8px; gap: 4px; }
  .itemName{ display: none; }
  .itemCharges{ font-size: 11px; }
  .btn{ padding: 6px 10px; font-size: 12px; border-radius: 10px; }

  .gameLayout{
    height: calc(100dvh - 52px);
    padding: 8px;
    gap: 8px;
    overflow: hidden;
  }

  .playColumn{
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto auto;
    gap: 8px;
    height: 100%;
    min-height: 0;
  }

  .boardWrap{
    grid-column: 1;
    grid-row: 1;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 14px;
  }

  .barWrap.barLeft{ display: none !important; }

  .barWrap.barTop{
    grid-column: 1;
    grid-row: 1;
    padding: 6px 8px 4px;
  }

  .barWrap.barTop .layerBarHorizontal{
    width: min(100%, calc(var(--hexStepX) * var(--maxCols)));
    height: 22px;
  }

  .barWrap.barTop .barPlayerMini{
    width: 20px;
    height: 20px;
  }

  .barWrap.barTop .goalMarker{
    width: 18px;
    height: 18px;
    font-size: 9px;
  }

  .boardScroll{
    grid-column: 1;
    grid-row: 2;
    padding: 4px 2px 4px 6px;
    overflow: hidden;
    height: 100%;
  }

  .board{
    width: calc(var(--hexStepX) * var(--maxCols));
    max-width: 100%;
  }

  .hexDeckOverlay{ display: none; }

  .mobileDeckRow{
    display: flex;
    grid-row: 2;
    flex-shrink: 0;
  }

  .side{
    grid-row: 3;
    order: unset;
    gap: 0;
    overflow: hidden;
    min-height: 0;
  }

  .logPanel{ display: none; }

  .statusPanel{
    padding: 10px 12px;
  }

  .statusPanel .miniTitle{
    margin-bottom: 6px;
  }

  .statusGrid{
    grid-template-columns: 1fr 1fr;
    gap: 2px 10px;
  }

  .statusGrid .miniRow{
    padding: 4px 0;
    border-bottom: none;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }

  .statusGrid .miniRow .k,
  .statusGrid .miniRow .v{
    font-size: 11px;
  }

  :root{
    --boardPadTop: 4px;
    --boardPadBottom: 4px;
    --barW: 20px;
    --barH: 22px;
    /* one-screen fit: topbar + layer bar + deck row + status + gaps */
    --hexWMain: min(
      64px,
      calc((100vw - 32px) / var(--hexGridWFactor)),
      calc((100dvh - 232px) / (var(--hexGridHFactor) * var(--hexAspect)))
    );
    --hexHMain: calc(var(--hexWMain) * var(--hexAspect));
  }

  .hexId{ font-size: calc(var(--hexWMain) * 0.28); }
  .mark{ width: 14px; height: 14px; font-size: 8px; }
}
`;function hf(e,t){var o;const r=e==null?void 0:e.transitionsByFromId;if(r!=null&&r.get){const a=r.get(t);if(a!=null&&a.to)return{type:a.type==="DOWN"?"DOWN":"UP",to:{layer:Number(a.to.layer),row:Number(a.to.row),col:Number(a.to.col)}}}const n=(o=e==null?void 0:e.scenario)==null?void 0:o.transitions;if(!n)return null;const l=Xe(t);if(!l)return null;for(const a of n){const i=a==null?void 0:a.from;if(!i)continue;const s=Number(i.layer),c=Number(i.row),h=Number(i.col);if(!Number.isFinite(s)||!Number.isFinite(c)||!Number.isFinite(h)||s!==l.layer||c!==l.row||h!==l.col)continue;const v=(a==null?void 0:a.type)==="DOWN"?"DOWN":"UP",g=(a==null?void 0:a.to)??{},w=Number(g.layer),E=Number(g.row),x=Number(g.col);return{type:v,to:{layer:Number.isFinite(w)?w:v==="UP"?l.layer+1:l.layer-1,row:Number.isFinite(E)?E:l.row,col:Number.isFinite(x)?x:l.col}}}return null}function rc(e,t){const r=hf(e,t);if(!r)return{next:e,finalId:t};const n="L"+r.to.layer+"-R"+r.to.row+"-C"+r.to.col,l=Br(e,n);return!l||l.missing||l.blocked?{next:e,finalId:t}:{next:{...e,playerHexId:n},finalId:n}}function z0(e){const t=Array.isArray(e==null?void 0:e.villains)&&e.villains||Array.isArray(e==null?void 0:e.villainTriggers)&&e.villainTriggers||Array.isArray(e==null?void 0:e.encounters)&&e.encounters||Array.isArray(e==null?void 0:e.triggers)&&e.triggers||[],r=["bad1","bad2","bad3","bad4"],n=[],l=a=>a>=1&&a<=7?a-1:a,o=a=>a>=1&&a<=7?a-1:a;for(const a of t){if(!a||typeof a!="object")continue;const i=a.from&&typeof a.from=="object"?a.from:a,s=String(a.key??a.villainKey??a.id??i.key??"bad1"),c=r.includes(s)?s:"bad1",h=Number(i.layer??i.L??a.layer??a.L??1);let v=Number(i.row??i.r??a.row??a.r??0);v=l(v);let g;const w=i.cols??i.col??i.c??a.cols??a.col??a.c;w==="any"?g="any":Array.isArray(w)?g=w.map(E=>o(Number(E))).filter(E=>Number.isFinite(E)):Number.isFinite(Number(w))&&(g=[o(Number(w))]),!(!Number.isFinite(h)||!Number.isFinite(v))&&n.push({key:c,layer:h,row:v,cols:g})}return n}function D0(){const[e,t]=b.useState("start"),[r,n]=b.useState([]),[l,o]=b.useState(null),a=b.useRef(null),i=!!l,[s,c]=b.useState([]),[h,v]=b.useState(null),g=b.useMemo(()=>s.find(p=>p.id===h)??null,[s,h]),[w,E]=b.useState(null),x=b.useMemo(()=>(g==null?void 0:g.scenarios.find(p=>p.id===w))??null,[g,w]),[W,f]=b.useState(null),d=b.useMemo(()=>{const p=x==null?void 0:x.tracks;return!p||p.length<=0?null:p.find(C=>C.id===W)??null},[x,W]);b.useEffect(()=>{c(b0())},[]);const[m,k]=b.useState(null),[y,R]=b.useState(null),[P,T]=b.useState(0),[D,O]=b.useState(1),[ge,Tt]=b.useState(1),nr=D>1,Zn=D<ge,[bo,Pt]=b.useState(null),[tn,_]=b.useState(null),[M,B]=b.useState(!1),[J,se]=b.useState(()=>typeof window<"u"?window.matchMedia("(max-width: 980px)").matches:!1);b.useEffect(()=>{const p=window.matchMedia("(max-width: 980px)"),C=()=>se(p.matches);return p.addEventListener("change",C),()=>p.removeEventListener("change",C)},[]);const xr=b.useRef(null),tt=b.useRef(null),rn=b.useRef(null),_e=b.useRef({cosmic:null,risk:null,terrain:null,shadow:null}),Ft=b.useRef(!1),[Ue,_o]=b.useState(null),wr=b.useRef(null),qn=b.useCallback(p=>{wr.current&&window.clearTimeout(wr.current);const C=Date.now();_o({key:C,layer:p}),wr.current=window.setTimeout(()=>{_o(null),wr.current=null},3e3)},[]);b.useEffect(()=>()=>{wr.current&&window.clearTimeout(wr.current)},[]);const yf=b.useMemo(()=>Ue?{"--layerFxColor":gn(Ue.layer)}:{},[Ue]),ht=b.useMemo(()=>{const p=y==null?void 0:y.playerHexId;return typeof p=="string"?p:null},[y,P]),Io=b.useMemo(()=>ht?Xe(ht):null,[ht]),We=(Io==null?void 0:Io.layer)??null,Lo=b.useCallback(()=>{o(null),a.current=null,n([]),k(null),v(null),E(null),f(null),R(null),xf(T),O(1),Tt(1),Pt(null),_(null),el(0),fs(null),ps(null),tl(null),rl.current=0,Po([]),Uo([{id:"reroll",name:"Reroll",icon:"🎲",charges:2},{id:"revealRing",name:"Reveal",icon:"👁️",charges:2},{id:"peek",name:"Peek",icon:"🧿",charges:1}]),_o(null),B(!1),t("start")},[]);function xf(p){p(C=>C+1)}const Ro=b.useCallback(p=>{const C=Xe(p);if(!C)return null;for(const N of r)if(N.layer===C.layer&&N.row===C.row&&(N.cols==="any"||!N.cols||Array.isArray(N.cols)&&N.cols.includes(C.col)))return N.key;return null},[r]),To=b.useMemo(()=>Array.from({length:oe.length},(p,C)=>C),[]);function wf(p){const C=p.layer;return u.createElement("div",{className:"ghostGrid","aria-hidden":"true"},To.map(N=>{const L=oe[N]??0;return u.createElement("div",{key:"ghost-row-"+C+"-"+N,className:"ghostRow"},Array.from({length:L},(F,A)=>u.createElement("div",{key:"g-"+C+"-"+N+"-"+A,className:"ghostSlot",style:tc(N,A)},u.createElement("div",{className:"ghostHex"}))))}))}function ds(p){var L,F;const C=p.side,N=p.currentLayer;if(C==="top"){const A=[1,2,3,4,5,6,7],z=vt?((L=Xe(vt))==null?void 0:L.layer)??null:null,U=ht?((F=Xe(ht))==null?void 0:F.layer)??null:null,V=ue=>`${(ue-.5)/7*100}%`;return u.createElement("div",{className:"barWrap barTop"},u.createElement("div",{className:"layerBar layerBarHorizontal"},A.map(ue=>{const ze=ue===N;return u.createElement("div",{key:ue,className:"barSeg"+(ze?" isActive":""),"data-layer":ue})}),U&&U>=1&&U<=7?u.createElement("div",{className:"barPlayerMini",style:{left:V(U)}},u.createElement("div",{className:"miniSprite",style:{"--spriteImg":"url("+Es()+")","--frameW":ks,"--frameH":Ss,"--cols":Oo,"--rows":ws,"--frameX":Cs,"--frameY":Ns(xs)}})):null,z&&z>=1&&z<=7?u.createElement("div",{className:"goalMarker",style:{left:V(z)}},"G"):null))}return u.createElement("div",{className:"barWrap barLeft"},u.createElement("div",{className:"layerBar rowShiftBar"},To.map(A=>{const z=y?c0(y,N,A):"";return u.createElement("div",{key:"rowSeg-"+A,className:"barSeg rowSeg"},z?u.createElement("span",{className:"rowShiftLabel"},z):null)})))}function kf(p){const C={"--cardGlow":p.glowVar};return u.createElement("div",{className:"hexDeckOverlay",style:C},u.createElement("div",{className:"hexDeckCol left"},u.createElement("div",{className:"hexDeckCard cosmic",ref:N=>_e.current.cosmic=N},u.createElement("div",{className:"deckFx"})),u.createElement("div",{className:"hexDeckCard risk",ref:N=>_e.current.risk=N},u.createElement("div",{className:"deckFx"}))),u.createElement("div",{className:"hexDeckCol right"},u.createElement("div",{className:"hexDeckCard terrain",ref:N=>_e.current.terrain=N},u.createElement("div",{className:"deckFx"})),u.createElement("div",{className:"hexDeckCard shadow",ref:N=>_e.current.shadow=N},u.createElement("div",{className:"deckFx"}))))}function Sf(p){const C={"--cardGlow":p.glowVar},N=["cosmic","risk","terrain","shadow"];return u.createElement("div",{className:"mobileDeckRow",style:C},N.map(L=>u.createElement("div",{key:L,className:"mobileDeckCard hexDeckCard "+L,ref:F=>_e.current[L]=F},u.createElement("div",{className:"deckFx"}))))}const[Ef,el]=b.useState(0),[vt,fs]=b.useState(null),[Cf,ps]=b.useState(null),[Nf,tl]=b.useState(null),kr=b.useCallback(p=>p?v0(p):null,[]),[bf,Po]=b.useState([]),rl=b.useRef(0),H=b.useCallback((p,C="info")=>{rl.current+=1;const N={n:rl.current,t:L0(),msg:p,kind:C};Po(L=>[N,...L].slice(0,24))},[]),Fo=b.useMemo(()=>{const p=new Set;if(!y||!ht||We!==D)return p;for(const C of Ln(y,ht)){const N=Br(y,C),L=wa(N);!L.missing&&!L.blocked&&p.add(C)}return p},[y,ht,We,D]),ae=(x==null?void 0:x.theme)??null,ms=(ae==null?void 0:ae.palette)??null,gs=(ae==null?void 0:ae.assets.backgroundGame)??"",hs=(ae&&ae.assets&&ae.assets.backgroundLayers||{})["L"+D]||"",_f=(ae==null?void 0:ae.assets.diceFacesBase)??"images/dice",nl=(ae==null?void 0:ae.assets.diceCornerBorder)??"",If=(ae==null?void 0:ae.assets.villainsBase)??"images/villains",vs=(ae==null?void 0:ae.assets.hexTile)??"",zo=b.useMemo(()=>{const p=ms;return{"--L1":(p==null?void 0:p.L1)??"#19ffb4","--L2":(p==null?void 0:p.L2)??"#67a5ff","--L3":(p==null?void 0:p.L3)??"#ffd36a","--L4":(p==null?void 0:p.L4)??"#ff7ad1","--L5":(p==null?void 0:p.L5)??"#a1ff5a","--L6":(p==null?void 0:p.L6)??"#a58bff","--L7":(p==null?void 0:p.L7)??"#ff5d7a"}},[ms]);function $e(p){return dt(_f+"/D20_"+p+".png")}function ys(p){return dt(If+"/"+p+".png")}function Ve(){return u.createElement(u.Fragment,null,u.createElement("span",{className:"diceCorner tl"}),u.createElement("span",{className:"diceCorner tr"}),u.createElement("span",{className:"diceCorner bl"}),u.createElement("span",{className:"diceCorner br"}))}const[xs,Do]=b.useState("down"),[Mo,ll]=b.useState(!1),Oo=4,ws=5,ks=128,Ss=128;function Es(){return dt("images/players/sprite_sheet_20.png")}const nn=b.useRef(null),Bo=b.useRef(0),[Cs,Lf]=b.useState(0),Rf=10,Tf=4;b.useEffect(()=>{const C=1e3/(Mo?Rf:Tf);Bo.current=performance.now();const N=L=>{L-Bo.current>=C&&(Lf(F=>(F+1)%Oo),Bo.current=L),nn.current=requestAnimationFrame(N)};return nn.current=requestAnimationFrame(N),()=>{nn.current&&cancelAnimationFrame(nn.current),nn.current=null}},[Mo]);const zt=b.useRef(null);b.useEffect(()=>()=>{zt.current&&window.clearTimeout(zt.current)},[]);function Ns(p){return p==="down"?0:p==="left"?1:p==="right"?2:3}const bs={x:-28,y:-36},[ln,_s]=b.useState(2),[Fe,Is]=b.useState(!1),[ol,Ao]=b.useState(bs),jo=b.useRef(null),Ls=b.useRef(2);b.useEffect(()=>()=>{jo.current&&window.clearTimeout(jo.current)},[]);function Rs(p){switch(p){case 1:return{x:-90,y:0};case 2:return{x:0,y:0};case 3:return{x:0,y:-90};case 4:return{x:0,y:90};case 5:return{x:0,y:180};case 6:return{x:90,y:0};default:return{x:0,y:0}}}const al=b.useCallback(()=>{if(Fe)return;Is(!0);const p=performance.now(),C=650,N=()=>{const L=performance.now()-p,F=1+Math.floor(Math.random()*6);if(_s(F),Ao(Rs(F)),L<C)jo.current=window.setTimeout(N,55);else{const A=1+Math.floor(Math.random()*6);Ls.current=A,_s(A),Ao(Rs(A)),Is(!1)}};N()},[Fe]),yt=b.useCallback((p,C)=>{for(let N=0;N<oe.length;N++){const L=oe[N]??7;for(let F=0;F<L;F++)dr(p,"L"+C+"-R"+N+"-C"+F)}},[]),il=b.useCallback((p,C)=>{dr(p,C);let N=[];try{N=Ln(p,C)}catch{try{N=Ln(C)}catch{N=[]}}for(const L of N)dr(p,L)},[]),[Ho,Uo]=b.useState([{id:"reroll",name:"Reroll",icon:"🎲",charges:2},{id:"revealRing",name:"Reveal",icon:"👁️",charges:2},{id:"peek",name:"Peek",icon:"🧿",charges:1}]),Pf=b.useCallback(p=>{const C=Ho.find(L=>L.id===p);if(!C||C.charges<=0)return;if(Uo(L=>L.map(F=>F.id===p?{...F,charges:Math.max(0,F.charges-1)}:F)),p==="reroll"){al(),H("Reroll used — rolling…","info");return}if(!y)return;const N=y.playerHexId??null;if(N){if(p==="revealRing"){il(y,N),T(L=>L+1),H("Used: Reveal (ring)","ok");return}if(p==="peek"){const L=Math.min(ge,D+1),F=Math.max(1,D-1),A=N.replace(/^L\d+-/,"L"+L+"-"),z=N.replace(/^L\d+-/,"L"+F+"-");il(y,A),il(y,z),T(U=>U+1),H("Used: Peek (above/below ring)","info");return}}},[Ho,al,H,y,il,ge,D]),Ts=b.useRef(!1);b.useEffect(()=>{const p=Ts.current;if(Ts.current=Fe,!!l&&!Fe&&p)try{if(o(Y=>Y&&{...Y,tries:Y.tries+1}),Ls.current!==6)return;const N=a.current;if(!N){H("Encounter cleared — risk event passed.","ok"),o(null);return}if(!y){H("Encounter error: game state missing.","bad");return}const L=Br(y,N);if(!L||L.missing||L.blocked){H("Encounter target is invalid now — click another tile.","bad"),a.current=null;return}const F=y.playerHexId,A=Zu(y,N);let z=ec(A);if(z&&mn(z),!z){const Y=A&&typeof A=="object"&&"reason"in A&&String(A.reason)||"Move failed after rolling a 6 — click another tile and roll again.";H(Y,"bad"),a.current=null;return}const U=z.playerHexId;let V=U??N;{const Y=rc(z,V);z=Y.next,V=Y.finalId}a.current=null,o(null),!!F&&!!U&&U!==F&&(ll(!0),zt.current&&window.clearTimeout(zt.current),zt.current=window.setTimeout(()=>ll(!1),420),Do(Xu(y,F,U))),el(Y=>Y+1);const ze=U?Xe(U):null,re=(ze==null?void 0:ze.layer)??D;R(z),T(Y=>Y+1),Number.isFinite(re)&&(At(z,re),re!==D&&(O(re),yt(z,re))),tl(kr(z)),H("Encounter cleared — moved to "+(U??N),"ok"),vt&&U&&U===vt&&H("Goal reached!","ok")}catch(C){console.error("Encounter resolution crashed:",C),H("Encounter crashed: "+String((C==null?void 0:C.message)??C),"bad")}},[l,Fe,y,ln,D,vt,yt,kr,H]);const[Ps,Ff]=b.useState([]),[Ge,sl]=b.useState(null),xt=b.useRef(null),Wo=b.useCallback((p,C)=>{xt.current&&window.clearTimeout(xt.current);const N=Date.now(),L=(C==null?void 0:C.durMs)??1400,F=(C==null?void 0:C.mode)??"flash";sl({key:N,card:p,durMs:L,villainKey:C==null?void 0:C.villainKey,mode:F}),F!=="riskEncounter"&&(xt.current=window.setTimeout(()=>{sl(null),xt.current=null},L))},[]);b.useEffect(()=>()=>{xt.current&&window.clearTimeout(xt.current)},[]),b.useEffect(()=>{l||sl(p=>(p==null?void 0:p.mode)==="riskEncounter"?null:p)},[l]);const $o=b.useCallback(p=>{const C=Xe(p);if(!C)return null;for(const N of Ps)if(N.layer===C.layer&&N.row===C.row&&N.col===C.col)return N.card;return null},[Ps]),[Dt,Fs]=b.useState(null),Vo=b.useRef(null);b.useEffect(()=>()=>{Vo.current&&window.clearTimeout(Vo.current)},[]);const zs=b.useCallback((p,C)=>{const N=(C==null?void 0:C.then)??"flip",L=()=>{if(N==="encounter"){const V=F0();a.current=null,o({villainKey:V,tries:0}),Ao(bs),Wo("risk",{villainKey:V,mode:"riskEncounter"}),H("Risk triggered — encounter: "+V+" (roll a 6)","bad");return}Wo(p)},F=_e.current[p]??(typeof document<"u"?document.querySelector(".mobileDeckRow .mobileDeckCard."+p):null);if(!F){L();return}const A=F.getBoundingClientRect(),z=window.getComputedStyle(F).borderRadius||"10px",U=Date.now();Fs({key:U,card:p,from:{x:A.left,y:A.top,w:A.width,h:A.height,borderRadius:z}}),Vo.current=window.setTimeout(L,520),window.setTimeout(()=>{Fs(null)},1200)},[Wo,H]),Ds=b.useCallback(()=>{a.current=null,o(null),sl(null),xt.current&&(window.clearTimeout(xt.current),xt.current=null)},[]),Go=b.useCallback(async()=>{var Ye;if(!x)return;const N=(x.tracks??[]).length>1?(d==null?void 0:d.scenarioJson)??x.scenarioJson:x.scenarioJson,L=await I0(N),F=P0(L);Ff(F),H("Card triggers loaded: "+F.length,"info");const A=z0(L);n(A),H("Villain triggers loaded: "+A.length,"info"),o(null),a.current=null,Ct.current=L;const z=h0(L);z.scenario=L,mn(z);const U=Math.max(1,Number((L==null?void 0:L.layers)??1));Tt(U);let V=z.playerHexId,ue=V?((Ye=Xe(V))==null?void 0:Ye.layer)??1:1;ue=Math.max(1,Math.min(U,ue)),(!V||!/^L\d+-R\d+-C\d+$/.test(V))&&(V=T0(z,ue),z.playerHexId=V);const ze=V?Xe(V):null;ze&&(ue=Math.max(1,Math.min(U,ze.layer)));const re=R0(L,ue);fs(re),At(z,ue),yt(z,ue),R(z),Pt(V),_(V),O(ue),Do("down"),el(0);const Y=kr(z);ps(Y),tl(Y),rl.current=0,Po([]),H("Started: "+x.name,"ok"),V&&H("Start: "+V,"info"),re&&H("Goal: "+re,"info"),Uo([{id:"reroll",name:"Reroll",icon:"🎲",charges:2},{id:"revealRing",name:"Reveal",icon:"👁️",charges:2},{id:"peek",name:"Peek",icon:"🧿",charges:1}]),window.setTimeout(()=>{tt.current&&(tt.current.scrollLeft=0)},0),t("game")},[x,d,yt,kr,H]);b.useEffect(()=>{Ft.current&&x&&(Ft.current=!1,Go())},[x,Go]);const Ms=b.useCallback(p=>{var Sr,ul;if(!y||i)return;if(We&&D!==We){O(We),At(y,We),yt(y,We),T(ne=>ne+1),H("You were viewing layer "+D+" but the player is on layer "+We+" — switched back.","info");return}const C=Br(y,p),N=wa(C);if(N.missing){H("Missing tile.","bad");return}if(N.blocked){H("Blocked tile.","bad");return}const L=y.playerHexId,F=Ro(p);if(F){a.current=p,o(ne=>ne?{...ne,villainKey:F}:{villainKey:F,tries:0}),H("Encounter: "+F+" — roll a 6 to continue","bad");return}const A=Zu(y,p);let z=ec(A);if(z&&mn(z),!z)if(Fo.has(p)&&y){const ne={...y};ne.playerHexId=p,!ne.scenario&&Ct.current&&(ne.scenario=Ct.current),z=ne,H("Force-moved (engine rejected)","info")}else{const ne=A&&typeof A=="object"&&"reason"in A&&String(A.reason)||"Move failed.";H(ne,"bad");return}const U=z.playerHexId,V=(L?(Sr=Xe(L))==null?void 0:Sr.layer:D)??D,ue=U?((ul=Xe(U))==null?void 0:ul.layer)??null:null,ze=!!L&&!!U&&U!==L;let re=U??p;{const ne=rc(z,re);z=ne.next,re=ne.finalId}el(ne=>ne+1);const Y=Xe(re),Ye=(Y==null?void 0:Y.layer)??ue??D;Ye&&V&&Ye!==V&&qn(Ye),ze&&(ll(!0),zt.current&&window.clearTimeout(zt.current),zt.current=window.setTimeout(()=>ll(!1),420),Do(Xu(y,L,U))),R(z),Pt(re),T(ne=>ne+1),At(z,Ye),Ye!==D&&(O(Ye),yt(z,Ye));const ut=$o(re);ut&&(zs(ut,ut==="risk"?{then:"encounter"}:void 0),H("Card triggered: "+ut,ut==="risk"?"bad":"info")),tl(kr(z)),H("Moved to "+re,"ok"),vt&&re===vt&&H("Goal reached!","ok")},[y,i,Fo,D,We,vt,H,yt,kr,Ro,qn,$o,zs]);return e==="start"?u.createElement("div",{className:"appRoot",style:zo},u.createElement("div",{className:"screen center"},u.createElement("div",{className:"panel"},u.createElement("div",{className:"title"},"Hex Game"),u.createElement("div",{className:"sub"},"Start → World → Character → Scenario → Game"),u.createElement("div",{className:"row"},u.createElement("button",{className:"btn primary",onClick:()=>t("world")},"Start"),u.createElement("button",{className:"btn",onClick:Lo},"Reset")),u.createElement("div",{className:"hint"},"Worlds loaded: ",u.createElement("b",null,s.length)))),u.createElement("style",null,ka)):e!=="game"?u.createElement("div",{className:"appRoot",style:zo},u.createElement("div",{className:"screen center"},u.createElement("div",{className:"panel wide"},u.createElement("div",{className:"title"},"Choose your run"),u.createElement("div",{className:"sub"},"Pick a world, then a scenario, then (optionally) a track."),u.createElement("div",{className:"grid",style:{marginTop:14}},s.map(p=>{const C=p.id===h;return u.createElement("button",{key:p.id,className:"card "+(C?"active":""),onClick:()=>{v(p.id);const N=p.scenarios&&p.scenarios.length?p.scenarios[0]:null;E(N?N.id:null);const L=N&&N.tracks&&N.tracks.length?N.tracks[0]:null;f(L?L.id:null),t("scenario")}},u.createElement("div",{className:"cardTitle"},p.name),u.createElement("div",{className:"cardDesc"},p.desc??""))})),g?u.createElement("div",{style:{marginTop:16}},u.createElement("div",{className:"tracksTitle"},"Scenarios"),u.createElement("div",{className:"grid"},g.scenarios.map(p=>{const C=p.id===w;return u.createElement("button",{key:p.id,className:"card "+(C?"active":""),onClick:()=>{E(p.id);const N=p.tracks&&p.tracks.length?p.tracks[0]:null;f(N?N.id:null),t("scenario")}},u.createElement("div",{className:"cardTitle"},p.name),u.createElement("div",{className:"cardDesc"},p.desc??""))}))):null,x&&x.tracks&&x.tracks.length>1?u.createElement("div",{className:"tracks"},u.createElement("div",{className:"tracksTitle"},"Tracks"),u.createElement("div",{className:"tracksRow"},x.tracks.map(p=>{const C=p.id===W;return u.createElement("button",{key:p.id,className:"chip "+(C?"active":""),onClick:()=>f(p.id)},p.name)})),u.createElement("div",{className:"hint"},"Selected: ",u.createElement("b",null,d?d.name:"—"))):x?u.createElement("div",{className:"hint",style:{marginTop:12}},x.tracks&&x.tracks.length===1?"Only one track available.":"No tracks for this scenario (it will start normally)."):null,u.createElement("div",{className:"row"},u.createElement("button",{className:"btn",onClick:Lo},"Back"),u.createElement("button",{className:"btn primary",disabled:!x,onClick:Go},"Start"),u.createElement("button",{className:"btn",onClick:()=>{const p=s[0],C=p&&p.scenarios?p.scenarios[0]:null;if(p&&C){v(p.id),E(C.id);const N=C.tracks&&C.tracks.length?C.tracks[0]:null;f(N?N.id:null),Ft.current=!0}}},"Quick start (debug)")),u.createElement("div",{className:"hint",style:{marginTop:10}},"World: ",u.createElement("b",null,g?g.name:"—")," · Scenario: ",u.createElement("b",null,x?x.name:"—")))),u.createElement("style",null,ka)):u.createElement("div",{className:"appRoot game",style:zo},u.createElement("div",{className:"gameBg",style:{backgroundImage:gs?"url("+dt(gs)+")":void 0}}),u.createElement("div",{className:"topbar"},u.createElement("div",{className:"items"},Ho.map(p=>u.createElement("button",{key:p.id,className:"itemBtn "+(p.charges<=0?"off":""),disabled:p.charges<=0||!y||i&&p.id!=="reroll"||Ue!==null,onClick:()=>Pf(p.id),title:p.name+" ("+p.charges+")"},u.createElement("span",{className:"itemIcon"},p.icon),u.createElement("span",{className:"itemName"},p.name),u.createElement("span",{className:"itemCharges"},p.charges)))),u.createElement("button",{className:"btn",disabled:!y||Ue!==null,onClick:()=>B(p=>!p)},M?"Hide Ghost":"Show Ghost"),u.createElement("button",{className:"btn",disabled:!y||!nr||i||Ue!==null,onClick:()=>{if(!y)return;const p=Math.max(1,D-1),C=mn(y);O(p),At(C,p),yt(C,p),T(N=>N+1),H("Layer "+p,"info"),qn(p)}},"− Layer"),u.createElement("button",{className:"btn",disabled:!y||!Zn||i||Ue!==null,onClick:()=>{if(!y)return;const p=Math.min(ge,D+1),C=mn(y);O(p),At(C,p),yt(C,p),T(N=>N+1),H("Layer "+p,"info"),qn(p)}},"+ Layer"),u.createElement("div",{className:"spacer"}),u.createElement("button",{className:"btn",onClick:Lo},"Reset")),u.createElement("div",{className:"gameLayout"},u.createElement("div",{className:"playColumn"},u.createElement("div",{className:"boardWrap"},u.createElement(ds,{side:"top",currentLayer:D}),u.createElement(ds,{side:"left",currentLayer:D}),u.createElement("div",{key:D,className:"boardLayerBg",style:{backgroundImage:hs?"url("+dt(hs)+")":void 0}}),J?null:u.createElement(kf,{glowVar:gn(D)}),u.createElement("div",{className:"boardScroll",ref:tt},u.createElement("div",{className:"board",ref:xr},u.createElement("div",{className:"hexGrid"},M?u.createElement(wf,{layer:D}):null,Ue?u.createElement("div",{key:Ue.key,className:"layerFxOverlay",style:yf,"aria-live":"polite"},u.createElement("div",{className:"layerFxCard"},u.createElement("div",{className:"layerFxTitle"},"Layer ",Ue.layer))):null,To.map(p=>{const C=oe[p]??0;return u.createElement("div",{key:"row-"+p,className:"hexRow"},Array.from({length:C},(N,L)=>{var Bs;const F=y?mf(y,D,p,L):null,A=tc(p,L);if(!F)return u.createElement("div",{key:"empty-"+p+"-"+L,className:"hexSlot empty",style:A});const z=hf(y,F),U=(z==null?void 0:z.type)==="UP",V=(z==null?void 0:z.type)==="DOWN",ue=((Bs=z==null?void 0:z.to)==null?void 0:Bs.layer)??null,ze=ue?gn(ue):null,re=Br(y,F),Y=wa(re);if(Y.missing)return u.createElement("div",{key:F,className:"hexSlot empty",style:A});const Ye=bo===F,ut=ht===F,Sr=tn===F,ul=We===D&&!ut&&Fo.has(F),ne=$o(F),Yo=vt===F,Os=!!Ro(F),zf=S0({revealed:!!(re!=null&&re.revealed),blocked:Y.blocked,isGoal:Yo,isStart:Sr,isPortalUp:U,isPortalDown:V}),Df={"--tileArt":`url(${dt(vs||E0(zf))})`};return u.createElement("div",{key:"v-"+p+"-"+L,className:"hexSlot",style:A},u.createElement("button",{ref:ut?rn:void 0,className:["hex",Ye?"sel":"",ul?"reach":"",Y.blocked?"blocked":"",ut?"player":"",Yo?"goal":"",Os?"trigger":"",Sr?"portalStart":"",U?"portalUp":"",V?"portalDown":""].join(" "),onClick:()=>{if(Ue===null){if(We&&D!==We){Ms(F);return}Pt(F),Ms(F)}},disabled:!y||Y.blocked||Y.missing||i||Ue!==null,style:{"--hexGlow":gn(D),...ze?{"--portalC":ze}:{}},title:F},u.createElement("div",{className:"hexAnchor"},u.createElement("div",{className:"hexInner",style:Df},u.createElement("div",{className:"hexCoords"},u.createElement("div",{className:"hexId"},p+","+L)),U||V?u.createElement("div",{className:"portalFx"},u.createElement("div",{className:"pAura"}),u.createElement("div",{className:"pOrbs"}),u.createElement("div",{className:"pRim"}),u.createElement("div",{className:"pOval"})):null,Sr?u.createElement("div",{className:"portalFx"},u.createElement("div",{className:"pAura"}),u.createElement("div",{className:"pRunes"}),u.createElement("div",{className:"pVortex"}),u.createElement("div",{className:"pWell"}),u.createElement("div",{className:"pShine"})):null,u.createElement("div",{className:"hexMarks"},U?u.createElement("span",{className:"mark"},"↑"):null,V?u.createElement("span",{className:"mark"},"↓"):null,Yo?u.createElement("span",{className:"mark g"},"G"):null,Os?u.createElement("span",{className:"mark t"},"!"):null)))),ne?u.createElement("div",{className:"cardBadge hexDeckCard "+ne,title:ne},u.createElement("div",{className:"deckFx"})):null,ut?u.createElement("span",{className:"playerSpriteSheet "+(Mo?"walking":""),style:{"--spriteImg":"url("+Es()+")","--frameW":ks,"--frameH":Ss,"--cols":Oo,"--rows":ws,"--frameX":Cs,"--frameY":Ns(xs)}}):null)}))}))))),J?u.createElement(Sf,{glowVar:gn(D)}):null,u.createElement("div",{className:"side"},u.createElement("div",{className:"panelMini statusPanel"},u.createElement("div",{className:"miniTitle"},"Status"),u.createElement("div",{className:"statusGrid"},u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Layer"),u.createElement("span",{className:"v"},D,"/",ge)),u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Moves"),u.createElement("span",{className:"v"},Ef)),u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Optimal (start)"),u.createElement("span",{className:"v"},Cf??"-")),u.createElement("div",{className:"miniRow"},u.createElement("span",{className:"k"},"Optimal (now)"),u.createElement("span",{className:"v"},Nf??"-")))),u.createElement("div",{className:"panelMini logPanel"},u.createElement("div",{className:"miniTitle"},"Log"),u.createElement("div",{className:"log"},bf.map(p=>u.createElement("div",{key:p.n,className:"logRow "+(p.kind??"")},u.createElement("div",{className:"lt"},p.t),u.createElement("div",{className:"lm"},p.msg)))))))),Dt?u.createElement("div",{className:"flyCardOverlay","aria-hidden":"true"},u.createElement("div",{key:Dt.key,className:"flyCard hexDeckCard "+Dt.card,style:{"--fromX":Dt.from.x+"px","--fromY":Dt.from.y+"px","--fromW":Dt.from.w+"px","--fromH":Dt.from.h+"px","--fromRadius":Dt.from.borderRadius}},u.createElement("div",{className:"flyFace flyFront"},u.createElement("div",{className:"deckFx"})),u.createElement("div",{className:"flyFace flyBack"},u.createElement("div",{className:"deckFx"})))):null,Ge&&Ge.mode==="riskEncounter"&&l?u.createElement("div",{key:Ge.key,className:"cardFlipOverlay riskEncounter",role:"dialog","aria-modal":"true",style:{"--flipDur":Ge.durMs+"ms","--diceBorderUrl":nl?"url("+dt(nl)+")":"none"}},u.createElement("div",{className:"riskEncounterStack"},u.createElement("div",{className:"cardFlipCard risk riskReveal"},u.createElement("div",{className:"cardFlipFace front"},u.createElement("div",{className:"riskCardFx"})),u.createElement("div",{className:"cardFlipFace back"},u.createElement("img",{src:ys(l.villainKey),alt:l.villainKey}))),u.createElement("div",{className:"riskEncounterControls"},u.createElement("div",{className:"encounterActionRow"},u.createElement("div",{className:"dice3d diceLg "+(Fe?"rolling":"")},u.createElement("div",{className:"cube",style:{transform:"rotateX("+ol.x+"deg) rotateY("+ol.y+"deg)"}},u.createElement("div",{className:"face face-front",style:{backgroundImage:"url("+$e(ln)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-back",style:{backgroundImage:"url("+$e(5)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-right",style:{backgroundImage:"url("+$e(3)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-left",style:{backgroundImage:"url("+$e(4)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-top",style:{backgroundImage:"url("+$e(1)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-bottom",style:{backgroundImage:"url("+$e(6)+")"}},u.createElement(Ve,null)))),u.createElement("div",{className:"encounterInfo"},u.createElement("div",{className:"encounterTitle"},"ENCOUNTER!"),u.createElement("div",{className:"encounterSub"},"Roll a ",u.createElement("b",null,"6")," to continue",u.createElement("span",{className:"encounterTries"},"Tries: ",u.createElement("b",null,l.tries))),u.createElement("div",{className:"encounterButtons"},u.createElement("button",{className:"btn primary",disabled:Fe,onClick:al},Fe?"Rolling…":"Roll"),u.createElement("button",{className:"btn",disabled:Fe,onClick:()=>{Ds(),H("Encounter dismissed (debug)","info")}},"Dismiss")),u.createElement("div",{className:"encounterRollPill"},"Roll = ",u.createElement("b",null,ln))))))):Ge?u.createElement("div",{key:Ge.key,className:"cardFlipOverlay","aria-hidden":"true",style:{"--flipDur":Ge.durMs+"ms"}},u.createElement("div",{className:"cardFlipCard "+Ge.card},u.createElement("div",{className:"cardFlipLabel"},Ge.card))):null,l&&(Ge==null?void 0:Ge.mode)!=="riskEncounter"?u.createElement("div",{className:"encounterScene",role:"dialog","aria-modal":"true",style:{"--diceBorderUrl":nl?"url("+dt(nl)+")":"none"}},u.createElement("div",{className:"encounterGrid"},u.createElement("div",{className:"encounterCard riskCard"},u.createElement("div",{className:"riskCardFx"}),u.createElement("img",{className:"riskVillainImg",src:ys(l.villainKey),alt:l.villainKey})),u.createElement("div",{className:"encounterRight"},u.createElement("div",{className:"encounterActionRow"},u.createElement("div",{className:"dice3d diceLg "+(Fe?"rolling":"")},u.createElement("div",{className:"cube",style:{transform:"rotateX("+ol.x+"deg) rotateY("+ol.y+"deg)"}},u.createElement("div",{className:"face face-front",style:{backgroundImage:"url("+$e(ln)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-back",style:{backgroundImage:"url("+$e(5)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-right",style:{backgroundImage:"url("+$e(3)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-left",style:{backgroundImage:"url("+$e(4)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-top",style:{backgroundImage:"url("+$e(1)+")"}},u.createElement(Ve,null)),u.createElement("div",{className:"face face-bottom",style:{backgroundImage:"url("+$e(6)+")"}},u.createElement(Ve,null)))),u.createElement("div",{className:"encounterInfo"},u.createElement("div",{className:"encounterTitle"},"ENCOUNTER!"),u.createElement("div",{className:"encounterSub"},"Roll a ",u.createElement("b",null,"6")," to continue",u.createElement("span",{className:"encounterTries"},"Tries: ",u.createElement("b",null,l.tries))),u.createElement("div",{className:"encounterButtons"},u.createElement("button",{className:"btn primary",disabled:Fe,onClick:al},Fe?"Rolling…":"Roll"),u.createElement("button",{className:"btn",disabled:Fe,onClick:()=>{Ds(),H("Encounter dismissed (debug)","info")}},"Dismiss")),u.createElement("div",{className:"encounterRollPill"},"Roll = ",u.createElement("b",null,ln))))))):null,u.createElement("style",null,ka))}const vf=document.getElementById("app");if(!vf)throw new Error("Missing #app element");Sa.createRoot(vf).render(u.createElement(u.StrictMode,null,u.createElement(D0,null)));
