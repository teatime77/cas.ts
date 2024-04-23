namespace casts {

/**
 * tool-typeのクリック
 */
export function setToolTypeEventListener(){
    const toolTypes = document.getElementsByName("tool-type");
    for(let x of toolTypes){
        x.addEventListener("click", setToolType);
    }
}

/**
 * Viewのイベント処理
 */
export function setViewEventListener(view: View){
    view.svg.addEventListener("click", view.svgClick);
//+    view.svg.addEventListener("pointerdown", view.svgPointerDown);  
//+    view.svg.addEventListener("pointerup"  , view.svgPointerUp);  
    view.svg.addEventListener("pointermove", view.svgPointerMove);  
//+    view.svg.addEventListener("wheel"      , view.svgWheel);
}


/**
 * Pointのイベント処理
 */
export function setPointEventListener(point: Point){
    point.circle.addEventListener("pointerdown", point.pointerdown);
    point.circle.addEventListener("pointermove", point.pointermove);
    point.circle.addEventListener("pointerup"  , point.pointerup);
}

/**
 * ShapeのNameのイベント処理
 */
export function setNameEventListener(shape: Shape){
    shape.svgName!.addEventListener("pointerdown", shape.namePointerdown);
    shape.svgName!.addEventListener("pointermove", shape.namePointermove);
    shape.svgName!.addEventListener("pointerup"  , shape.namePointerup);
}


export function setMapEventListener(map : MapSVG){
    map.svg.addEventListener("pointerdown", map.onPointerDown.bind(map));
    map.svg.addEventListener("pointerup"  , map.onPointerUp.bind(map));
    map.svg.addEventListener("pointermove", map.onPointerMove.bind(map));
    // map.svg.addEventListener("wheel"      , map.onWheel.bind(map));
}


}