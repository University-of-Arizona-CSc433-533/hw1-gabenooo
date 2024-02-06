/*
  Basic File I/O for displaying
  Skeleton Author: Joshua A. Levine
  Modified by: Gabe Noriega
  Email: ggn@email.arizona.edu
  */


//access DOM elements we'll use
var input = document.getElementById("load_image");
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var ppm_img_data;
var rotationAngle = 3; 
var rotationSpeed = 6; 

//Function to process upload
var upload = function () {
    if (input.files.length > 0) {
        var file = input.files[0];
        console.log("You chose", file.name);
        if (file.type) console.log("It has type", file.type);
        var fReader = new FileReader();
        fReader.readAsBinaryString(file);

        fReader.onload = function(e) {
            //if successful, file data has the contents of the uploaded file
            var file_data = fReader.result;
            ppm_img_data = parsePPM(file_data);
            animateRotation(ppm_img_data); // Call animateRotation here
            requestAnimationFrame(function() {
                animateRotation(ppm_img_data);
            });
        }


    }
}

// Load PPM Image to Canvas
function parsePPM(file_data){
    /*
   * Extract header
   */
    var format = "";
    var width = 0;
    var height = 0;
    var max_v = 0;
    var lines = file_data.split(/#[^\n]*\s*|\s+/); // split text by whitespace or text following '#' ending with whitespace
    var counter = 0;
    // get attributes
    for(var i = 0; i < lines.length; i ++){
        if(lines[i].length == 0) {continue;} //in case, it gets nothing, just skip it
        if(counter == 0){
            format = lines[i];
        }else if(counter == 1){
            width = lines[i];
        }else if(counter == 2){
            height = lines[i];
        }else if(counter == 3){
            max_v = Number(lines[i]);
        }else if(counter > 3){
            break;
        }
        counter ++;
    }
    console.log("Format: " + format);
    console.log("Width: " + width);
    console.log("Height: " + height);
    console.log("Max Value: " + max_v);
    /*
     * Extract Pixel Data
     */
    var bytes = new Uint8Array(3 * width * height);  // i-th R pixel is at 3 * i; i-th G is at 3 * i + 1; etc.
    // i-th pixel is on Row i / width and on Column i % width
    // Raw data must be last 3 X W X H bytes of the image file
    var raw_data = file_data.substring(file_data.length - width * height * 3);
    for(var i = 0; i < width * height * 3; i ++){
        // convert raw data byte-by-byte
        bytes[i] = raw_data.charCodeAt(i);
    }
    // update width and height of canvas
    document.getElementById("canvas").setAttribute("width", width);
    document.getElementById("canvas").setAttribute("height", height);
    // create ImageData object
    var image_data = ctx.createImageData(width, height);
    // fill ImageData
    for(var i = 0; i < image_data.data.length; i+= 4){
        let pixel_pos = parseInt(i / 4);
        image_data.data[i + 0] = bytes[pixel_pos * 3 + 0]; // Red ~ i + 0
        image_data.data[i + 1] = bytes[pixel_pos * 3 + 1]; // Green ~ i + 1
        image_data.data[i + 2] = bytes[pixel_pos * 3 + 2]; // Blue ~ i + 2
        image_data.data[i + 3] = 255; // A channel is deafult to 255
    }
    ctx.putImageData(image_data, canvas.width/2 - width/2, canvas.height/2 - height/2);
    ppm_img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log(ppm_img_data);
    return ppm_img_data;
}


function animateRotation(image_data) {
    // clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height );
    
    // scaling and rotation factors
    var scaleX = 0.5;
    var scaleY = 0.5;
    var cosTheta = Math.cos(rotationAngle * Math.PI / 180);
    var sinTheta = Math.sin(rotationAngle * Math.PI / 180);
 
    // translate to center of canvas
    var translateToCenterMatrix = [
        1, 0, canvas.width / 2,
        0, 1, canvas.height / 2,
        0, 0, 1
    ];
 
    // translate back from center of canvas
    var translateBackMatrix = [
        1, 0, -canvas.width / 2,
        0, 1, -canvas.height / 2,
        0, 0, 1
    ];
 
    // scaling and rotation transformation matrices
    var scaleMatrix = [
        1 / scaleX, 0, 0,
        0, 1 / scaleY, 0,
        0, 0, 1
    ];
    var rotationMatrix = [
        cosTheta, +sinTheta, 0,
        -sinTheta, cosTheta, 0,
        0, 0, 1
    ];
 
    // combine 
    var combinedMatrix = matrixMultiply(translateToCenterMatrix, matrixMultiply(scaleMatrix, matrixMultiply(rotationMatrix, translateBackMatrix)));
 
    // new image obj
    var output_image = ctx.createImageData(canvas.width, canvas.height);
 
    // go through the pixels of the scaled down image
    for (var y = 0; y < output_image.height; y++) {
        for (var x = 0; x < output_image.width; x++) {
            // apply matrix
            var transformedPosition = matrixVectorMultiply(combinedMatrix, new Vec3(x, y, 1));
 
            // round 
            var originalX = Math.round(transformedPosition.x);
            var originalY = Math.round(transformedPosition.y);
 
            // skip if the original pixel position is outside the original image
            if (originalX < 0 || originalX >= image_data.width || originalY < 0 || originalY >= image_data.height) {
                continue;
            }
 
            //  get indices for pixel data in original image
            var originalIndex = (originalY * image_data.width + originalX) * 4;
 
            // get index for accessing pixel data in scaled down image
            var newIndex = (y * output_image.width + x) * 4;
 
            // copy pixel data from original image to new one
            for (var i = 0; i < 4; i++) {
                output_image.data[newIndex + i] = image_data.data[originalIndex + i];
            }
        }
    }
 
    // put image on canvas
    ctx.putImageData(output_image, 0, 0);
    rotationAngle += rotationSpeed
    // next frame
    requestAnimationFrame(function() {
         animateRotation(image_data);
    });
 }

// matrix vector multiplication
function matrixVectorMultiply(matrix, vector) {
    var result = new Vec3(
        matrix[0] * vector.x + matrix[1] * vector.y + matrix[2] * vector.z,
        matrix[3] * vector.x + matrix[4] * vector.y + matrix[5] * vector.z,
        matrix[6] * vector.x + matrix[7] * vector.y + matrix[8] * vector.z
    );
    return result;
}
// matrix multiplication
function matrixMultiply(matrix1, matrix2) {
    var result = new Array(9).fill(0);
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            for (var k = 0; k < 3; k++) {
                result[i * 3 + j] += matrix1[i * 3 + k] * matrix2[k * 3 + j];
            }
        }
    }
    return result;
}

//Connect event listeners
input.addEventListener("change", upload);


