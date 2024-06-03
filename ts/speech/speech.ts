namespace casts{
let voiceList:  {[key: string]: SpeechSynthesisVoice } = {};
let uttrVoice : SpeechSynthesisVoice |  undefined;
const voiceLang = "ja-JP";  //"en-US"
const voiceNames : string[] = [];// "Microsoft Ana Online (Natural) - English (United States)"; // "Google US English";
const voiceNamesDic : { [lang: string]: string[] } = {
    "ja-JP" : [
        "Microsoft Nanami Online (Natural) - Japanese (Japan)",
        "Microsoft Ayumi - Japanese (Japan)",
        "Google 日本語"
    ]
    ,
    "en-US" : [
    ]
};

const voices : { [lang: string]: SpeechSynthesisVoice[] } = {};

let prevCharIndex = 0;
let Phrases : Phrase[] = [];
let phraseIdx : number = 0;
let wordIdx : number = 0;
let speechRrate : HTMLInputElement;

export class Phrase {
    words   : string[];

    constructor(words : string[]){
        this.words   = words;
    }
}

export class Speech {
    prevCharIndex = 0;
    lang : string;
    lang2 : string;

    constructor(){        
        this.lang = $sel("voice-lang-select").value;
        this.lang2 = this.lang.substring(0, 2);

        const voice_name = $sel("voice-name-select").value;
        uttrVoice = voices[this.lang].find(voice => voice.name == voice_name);
        assert(uttrVoice != undefined);
    }

    speak(text : string){
        msg(`Speak ${text}`);
    
        const uttr = new SpeechSynthesisUtterance(text);
    
        uttr.voice = uttrVoice!;

        uttr.addEventListener("end", this.onEnd.bind(this));
        uttr.addEventListener("boundary", this.onBoundary.bind(this));
        uttr.addEventListener("mark", this.onMark.bind(this));
    
        uttr.rate = parseFloat(speechRrate.value);
            
        speechSynthesis.speak(uttr);
    }

    onBoundary(ev: SpeechSynthesisEvent) : void {
        const text = ev.utterance.text.substring(this.prevCharIndex, ev.charIndex).trim();
        if(ev.charIndex == 0){

            msg(`Speech start name:${ev.name} text:[${ev.utterance.text}]`)
        }
        else{
    
            msg(`Speech bdr: idx:${ev.charIndex} name:${ev.name} type:${ev.type} text:[${text}]`);
        }
        this.prevCharIndex = ev.charIndex;
    
    }

    onEnd(ev: SpeechSynthesisEvent) : void {
        msg(`Speech end: idx:${ev.charIndex} name:${ev.name} type:${ev.type} text:[${ev.utterance.text.substring(this.prevCharIndex)}]`);
    }
    
    onMark(ev: SpeechSynthesisEvent) : void {

    }
}

export function showSpeech(){
    $dlg("speech-dlg").showModal();
}

export function speakTest(){
    const text_area = $("text-data") as HTMLTextAreaElement;
    speak(text_area.value.trim());
}

export function pronunciation(word: string) : string[]{
    if(word[0] == '\\'){
        const tbl : {[key:string]:string[]} = {
            "dif" : ["diff"],
            "Delta" : ["delta"],
            "lim" : ["limit"],
            "frac" : ["fraction"],
            "sqrt" : "square root".split(" "),
            "ne" : "not equals".split(" "),
            "lt" : "is less than".split(" "),
            "gt" : "is greater than".split(" "),
            "le" : "is less than or equals".split(" "),
            "ge" : "is greater than or equals".split(" "),
        };

        const name = word.substring(1);
        if(name in tbl){
            return tbl[name];
        }
        else{
            return [name];
        }
    }
    
    return [word];
}

function setVoice(){
    const voice_lang_select = $sel("voice-lang-select");
    const voice_name_select = $sel("voice-name-select");

    let voice_priority = 100;

    for(const voice of speechSynthesis.getVoices()){
        if(voices[voice.lang] == undefined){
            voices[voice.lang] = [];

            const opt = document.createElement("option");
            opt.text = voice.lang;
            opt.value = voice.lang;
            voice_lang_select.add(opt);
        }

        voices[voice.lang].push(voice);

        if(true || voice.lang == voiceLang || voice.lang == "ja-JP"){

            msg(`${voice.lang} [${voice.name}] ${voice.default} ${voice.localService} ${voice.voiceURI}`);

            const voice_idx = voiceNames.indexOf(voice.name);
            if(voice_idx == -1){
                if(voice_priority == 100){
                    msg(`set voice by name[${voice.name}]`);
                    uttrVoice = voice;    
                }
            }
            else if(voice_idx < voice_priority){
                voice_priority = voice_idx;
                msg(`set voice by name[${voice.name}]`);
                uttrVoice = voice;    
            }

            voiceList[voice.name] = voice;
        }
    }

    voice_lang_select.addEventListener("change", (ev:Event)=>{
        const lang = voice_lang_select.value;

        voice_name_select.innerHTML = "";
        for(const voice of voices[lang]){
            const opt = document.createElement("option");
            opt.text = voice.name;
            opt.value = voice.name;
            voice_name_select.add(opt);
        }
        uttrVoice = voiceList[voice_name_select.value];
        msg(`set voice by name[${uttrVoice.name}]`);
    });

    voice_name_select.addEventListener("change", (ev:Event)=>{
        uttrVoice = voiceList[voice_name_select.value];
        msg(`set voice by name[${uttrVoice.name}]`);
    });

}

function initSpeechSub(){
    speechRrate = $("speech-rate") as HTMLInputElement;

    if ('speechSynthesis' in window) {
        msg("このブラウザは音声合成に対応しています。🎉");
    }
    else {
        msg("このブラウザは音声合成に対応していません。😭");
    }    
}

export function initSpeech(){
    initSpeechSub();

    speechSynthesis.onvoiceschanged = function(){
        msg("voices changed");
        setVoice();
    };
}

export async function asyncInitSpeech() : Promise<void> {
    initSpeechSub();

    return new Promise((resolve) => {
        speechSynthesis.addEventListener("voiceschanged", (ev:Event)=>{
            setVoice();
            msg("speech initialized");
            resolve();
        })
    });
}


export function speak(text : string){
    assert(uttrVoice != null);
    msg(`speak ${text}`);

    const uttr = new SpeechSynthesisUtterance(text);

    uttr.voice = uttrVoice!;

    // スピーチ 終了
    uttr.onend = onSpeechEnd;

    // スピーチ 境界
    uttr.onboundary = onSpeechBoundary;

    uttr.onmark = onMark;

    uttr.rate = parseFloat(speechRrate.value);
        
    speechSynthesis.speak(uttr);
}

export function cancelSpeech(){
    speechSynthesis.cancel();
}

export function speakNode(phrases : Phrase[]){
    console.assert(phrases.length != 0);

    const text = phrases.map(x => x.words.join(" ")).join(" ");
    msg(`speech ${text}`);

    Phrases = phrases.slice();
    phraseIdx = 0;
    wordIdx   = 0;

    speak(text);
}

function onSpeechBoundary(ev: SpeechSynthesisEvent){
    const text = ev.utterance.text.substring(prevCharIndex, ev.charIndex).trim();

    if(ev.charIndex == 0){

        msg(`speech start name:${ev.name} text:[${text}]`)
    }
    else{

        msg(`speech bdr: idx:${ev.charIndex} name:${ev.name} type:${ev.type} text:[${text}]`);

        if(phraseIdx < Phrases.length){
            const phrase = Phrases[phraseIdx];
            if(phrase.words[wordIdx] != text){
    
                msg(`bdr [${phrase.words[wordIdx]}] <> [${text}]`)
            }
            console.assert(phrase.words[wordIdx] == text);
    
            wordIdx++;
            if(wordIdx < phrase.words.length){
                msg(`next word ${phrase.words[wordIdx]}`);
            }
            else{
                phraseIdx++;
                wordIdx = 0;
                if(phraseIdx < Phrases.length){
        
                    msg(`next phrase :${Phrases[phraseIdx].words.join(" ")}`);
                }
                else{
    
                    msg(`End of speak node`);
                }
            }
        }
    }
    prevCharIndex = ev.charIndex;
}

function onSpeechEnd(ev: SpeechSynthesisEvent){
    msg(`speech end: idx:${ev.charIndex} name:${ev.name} type:${ev.type} text:[${ev.utterance.text.substring(prevCharIndex)}]`);
}

function onMark(ev: SpeechSynthesisEvent){
    msg(`speech mark: idx:${ev.charIndex} name:${ev.name} type:${ev.type} text:${ev.utterance.text.substring(prevCharIndex, ev.charIndex)}`);
}
    
}