/** Rotational agnostic binary values */
const binary = [
	"000000000000000", "100000000000000", "110000000000000", "101000000000000",
	"111000000000000", "100100000000000", "110100000000000", "101100000000000",
	"111100000000000", "100010000000000", "110010000000000", "101010000000000",
	"111010000000000", "100110000000000", "110110000000000", "101110000000000",
	"111110000000000", "100001000000000", "110001000000000", "101001000000000"
]

const svgns = "http://www.w3.org/2000/svg"
let dotContainer;
let lineContainer;
let center = {x:0, y:0}
let oldScale = 1;
let draggingCircle = null;
let offsetX, offsetY;

/** Stores line objects */
let lines = {level:[], school:[], range:[], duration:[], aoe:[], damages:[], condition:[]}
/** Determines the k or "skip" value */
const attributeImportance = ["level", "school", "range", "duration", "aoe", "damages", "condition"]

//Lists of attribute options
const schools = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"]
const ranges = ["Self", "Touch", "5 feet", "10 feet", "15 feet", "20 feet", "30 feet", "60 feet", "90 feet", "100 feet", "120 feet", "150 feet", "300 feet", "500 feet", "1 mile", "5 miles", "Sight", "Unlimited"]
const durations = ["Instantaneous", "1 Round", "1 Minute", "10 Minutes", "1 Hour", "8 Hours", "24 Hours", "Permanent"]
const areasOfEffects = ["Target", "Multiple Targets", "Circle", "Cone", "Cube", "Cylinder", "Emanation", "Line", "Sphere", "Square"]
const damages = ["Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder", "Healing"]
const conditions = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"]

/** x, y positions of the dots on the page*/
let dotPositions = []
/** Actual dot objects */
let dots = []
/** The number of dots is 2n + 1, where n is the number of attributes */
const numDots = attributeImportance.length*2 + 1;

function setUp(){
	//set up the toggle switching
	getElement("rotationToggle").addEventListener("change", () => {
		//switch text disabled
		let checked = getElement("rotationToggle").checked;
		getElement("rotFree").classList.toggle("disabledText");
		getElement("rotLocked").classList.toggle("disabledText");
		getElement("damageMultiple").style.display = checked?"":"none";
		getElement("damageSingle").style.display = checked?"none":"";
		getElement("aoeMultiple").style.display = checked?"":"none";
		getElement("aoeSingle").style.display = checked?"none":"";
		getElement("conditionMultiple").style.display = checked?"":"none";
		getElement("conditionSingle").style.display = checked?"none":"";
		drawAllLayers();
		let sliders = document.querySelectorAll("input[type='range']");
		for(let i = 0; i<sliders.length; i++){
			sliders[i].disabled = checked;
		}
		let top = dots[0]
		top.setAttribute("stroke-width", checked?"5":"")
		top.setAttribute("stroke", checked?"black":"")
		top.setAttribute("fille", checked?"white":"red")
	})

	window.addEventListener("resize", ()=>{
		let bounds = dotContainer.getBoundingClientRect()
		center.x = bounds.width/2
		center.y = bounds.height/2
		resizeDots(getElement("glyph-dots").getBoundingClientRect().width);
		drawAllLayers();
	})

	//Set up the spell options
	let levelSelection = document.getElementById("spellLevel")
	for(let i = 0; i<=9; i++){
		let option = document.createElement("option");
		option.value = i;
		option.innerText = i==0?"Cantrip":i;
		levelSelection.appendChild(option);
	}
	levelSelection.addEventListener("change", ()=>{drawLayer("level")})

	singleSelectionOptions("spellSchool", schools, 1);
	getElement("spellSchool").addEventListener("change", ()=>{drawLayer("school")})


	singleSelectionOptions("range", ranges);
	getElement("range").addEventListener("change", ()=>{drawLayer("range")})


	singleSelectionOptions("duration", durations);
	getElement("duration").addEventListener("change", ()=>{drawLayer("duration")})


	multipleSelectionOptions("aoeMultiple", areasOfEffects, "aoe");
	singleSelectionOptions("aoeSingle", areasOfEffects, 1);
	getElement("aoeSingle").addEventListener("change", ()=>{drawLayer("aoe")})


	multipleSelectionOptions("damageMultiple", damages, "damages");
	singleSelectionOptions("damageSingle", ["None", ...damages]);
	getElement("damageSingle").addEventListener("change", ()=>{drawLayer("damages")})


	multipleSelectionOptions("conditionMultiple", conditions, "condition");
	singleSelectionOptions("conditionSingle", ["None", ...conditions]);
	getElement("conditionSingle").addEventListener("change", ()=>{drawLayer("condition")})


	let sliders = document.querySelectorAll("input[type='range']");
	for(let i = 0; i<sliders.length; i++){
		let slider = sliders[i];
		slider.min = 0;
		slider.max = numDots - 1;
		slider.value = 0;
		slider.addEventListener("input", ()=>{drawLayer(slider.id.replace("Slider", ""))})
	}

	//set up canvas
	dotContainer = getElement("glyph-dots")
	lineContainer = getElement("glyph-lines")
	let bounds = dotContainer.getBoundingClientRect()
	oldScale = bounds.width
	center.x = bounds.width/2
	center.y = bounds.height/2
	setCirclularDots(numDots)
	drawDots();
	// Mouse move event to move the circle
	dotContainer.addEventListener('mousemove', (event) => {
		if (draggingCircle != null) {
			let position = dotPositions[dots.indexOf(draggingCircle)]
			const rect = dotContainer.getBoundingClientRect();
			// Update the circle's position based on the mouse position
			const newX = event.clientX - offsetX;
			const newY = event.clientY - offsetY;
			// Set new position while ensuring the circle stays within the SVG bounds
			const circleRadius = draggingCircle.r.baseVal.value;
			const svgWidth = rect.width;
			const svgHeight = rect.height;
			// Constrain the circle's movement to stay within the SVG parent
			const constrainedX = Math.min(Math.max(newX, circleRadius), svgWidth - circleRadius);
			const constrainedY = Math.min(Math.max(newY, circleRadius), svgHeight - circleRadius);
			draggingCircle.setAttribute('cx', constrainedX);
			position.x = constrainedX
			draggingCircle.setAttribute('cy', constrainedY);
			position.y = constrainedY
			drawAllLayers()
		}
	});

	drawAllLayers()
}

/** Fills out the select element
 * @param {string} selectId Id of the select element
 * @param {Array} list The appropriate list of attribute options
 * @param {number} [offset=0] Offset the value to be larger
 */
function singleSelectionOptions(selectId, list, offset = 0){
	let div = document.getElementById(selectId);
	for(let i = 0; i<list.length; i++){
		let option = document.createElement("option");
		option.value = i+offset;
		option.innerText = list[i]
		div.appendChild(option);
	}
}

/** Fills out a div with lots of checkboxes
 * @param {string} divId Id of the holder div
 * @param {Array} list The appropriate list of attribute options
 * @param {string} layer Name of the attribute, to call drawLayer() on each checkbox's change
 */
function multipleSelectionOptions(divId, list, layer){
	let div = document.getElementById(divId);
	for(let i = 0; i<list.length; i++){
		let holder = document.createElement("div")
		let checkbox = document.createElement("input");
		checkbox.type = "checkbox"
		checkbox.id = list[i]
		checkbox.addEventListener("change", ()=>{drawLayer(layer)})
		let label = document.createElement("label")
		label.htmlFor = list[i]
		label.innerText = list[i]
		holder.appendChild(checkbox);
		holder.appendChild(label);
		div.appendChild(holder)
	}
}

//I got tired of typing out document.getElement...
function getElement(id){
	return document.getElementById(id);
}

/** Takes the level select and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function levelToValue(){
	return binary[getElement("spellLevel").value]
}

/** Takes the spell school select and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function schoolToValue(){
	return binary[getElement("spellSchool").value]
}

/** Takes the range select and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function rangeToValue(){
	return binary[getElement("range").value]
}

/** Takes the duration select and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function durationToValue(){
	return binary[getElement("duration").value]
}

/** Takes the damage select or checkboxes and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function damagesToValue(){
	if(getElement("rotationToggle").checked){
		let result = new Array(numDots).fill(0)
		let selectedDamages = document.querySelectorAll("#damageMultiple input[type='checkbox']:checked")
		selectedDamages.forEach(node=>{
			result[damages.indexOf(node.id)] = 1
		})
		return result.join("")
	}else{
		return binary[getElement("damageSingle").value];
	}
}

/** Takes the damage select or checkboxes and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function aoeToValue(){
	if(getElement("rotationToggle").checked){
		let result = new Array(numDots).fill(0);
		let aoeSelected = document.querySelectorAll("#aoeMultiple input[type='checkbox']:checked")
		aoeSelected.forEach(node=>{
			result[areasOfEffects.indexOf(node.id)] = 1
		})
		return result.join("")
	}else{
		return binary[getElement("aoeSingle").value];
	}
}

/** Takes the damage select or checkboxes and returns the appropriate rotationally agnostic binary value
 * @returns {string}
 */
function conditionToValue(){
	if(getElement("rotationToggle").checked){
		let result = new Array(numDots).fill(0);
		let conditionSelected = document.querySelectorAll("#conditionMultiple input[type='checkbox']:checked")
		conditionSelected.forEach(node=>{
			result[areasOfEffects.indexOf(node.id)] = 1
		})
		return result.join("")
	}else{
		return binary[getElement("conditionSingle").value];
	}
}

/** Mathematically determine n equally spaced points around a circle
 * @param {number} n The number of dots
 */
function setCirclularDots(n){
	dotPositions = []
	let radius = 0.85*center.x;
	for(let i = 0; i<n; i++){
		let theta = i*2*Math.PI/n - Math.PI/2; //minus half radian to rotate quarter circle ccw
		let x = radius * Math.cos(theta) + center.x;
		let y = radius * Math.sin(theta) + center.y;
		let position = {"x":x, "y":y}
		dotPositions.push(position)
	}
}
/** Draws dots based on the stored positions */
function drawDots(){
	while(dots.length>0){
		let d = dots[i].pop();
		d.remove();
	}
	for(let i = 0; i<dotPositions.length; i++){
		let circle = document.createElementNS(svgns, "circle")
		circle.setAttributeNS(null, "r", 10);
		circle.setAttributeNS(null, "cx", dotPositions[i].x);
		circle.setAttributeNS(null, "cy", dotPositions[i].y);
		circle.setAttributeNS(null, "fill", "red");
		// Mouse down event to start dragging
		circle.addEventListener('mousedown', (event) => {
			draggingCircle = circle;
			offsetX = event.clientX - circle.cx.baseVal.value;
			offsetY = event.clientY - circle.cy.baseVal.value;
			event.preventDefault();
		});
		circle.addEventListener('mouseup', (event)=>{
			draggingCircle = null;
		})
		dotContainer.appendChild(circle)
		dots.push(circle)
	}
}

/** Changes spot positions to remain the same relative to the size of the svg element
 * @param {number} newScale The width of the svg, since it's a square.
 */
function resizeDots(newScale){
	let scaling = newScale/oldScale;
	for(let i = 0; i<dots.length; i++){
		let circle = dots[i]
		let position = dotPositions[i]
		position.x *= scaling;
		circle.setAttributeNS(null, "cx", position.x);
		position.y *= scaling
		circle.setAttributeNS(null, "cy", position.y);
	}
	oldScale = newScale;
}

/** Loops through all attributes and draws their layers */
function drawAllLayers(){
	for(i = 0; i<attributeImportance.length; i++){
		drawLayer(attributeImportance[i])
	}
}

/** Gets the appropriate value for the attribute and determines skip and offset
 * @param {string} name Attribute name
 */
function drawLayer(name){
	let lineArray = lines[name];
	let value = eval(name+"ToValue()");
	let skip = attributeImportance.indexOf(name)+1;
	let offset = getElement("rotationToggle").checked?0:parseInt(getElement(name+"Slider").value);

	while(lineArray.length>0){
		let remove = lineArray.pop()
		remove.remove()
	}
	drawLines(value, skip, offset, lineArray);
}

/** Draws a line based on the provided values.
 * @param {string} value The binary string that tells what lines to draw
 * @param {number} skip The length of the line
 * @param {number} offset The number of dots from the top left to treat as the starting dot
 * @param {Array} lineStorage The appropriate field of lines
 */
function drawLines(value, skip, offset, lineStorage){
	let toDraw = value.split("");
	for(let i = 0; i<toDraw.length; i++){
		if(toDraw[i] == "1"){
			let line = document.createElementNS(svgns, "line");
			let start = (i+offset) % 13;
			let end = (start+skip) % 13;
			line.setAttributeNS(null, "x1", dotPositions[start].x);
			line.setAttributeNS(null, "y1", dotPositions[start].y);
			line.setAttributeNS(null, "x2", dotPositions[end].x);
			line.setAttributeNS(null, "y2", dotPositions[end].y);
			line.setAttributeNS(null, "stroke", "black");
			line.setAttributeNS(null, "stroke-width", 5);
			lineStorage.push(line);
			lineContainer.appendChild(line)
		}
	}
}