/*
  Usage in After Effects:
  1. Import the generated JSON file into your AE project.
  2. Create a Text Layer or other property you want to link.
  3. Alt+Click the stopwatch to add an expression.
  4. Use the following code (adjust "template_data.json" to your file name):
*/

// For a Text Layer (e.g. Player Name)
try {
    var jsonFile = footage("template_data.json");
    var data = jsonFile.sourceData;
    // Replace 'player1_name' with the exact Label you defined in the Web App
    data.data.player1_name;
} catch (e) {
    "MISSING DATA";
}

// For an Image Layer (Source Text isn't used here, but for opacity or reloading)
// *Note*: For swapping images dynamically, typically you need a script or a plugin like "NexRender".
// HOWEVER, a simple method without plugins:
// 1. Have a placeholder image in AE.
// 2. Right click -> Replace Footage -> File (select the new image).
//
// If you want purely JSON driven images without a plugin, you usually need a Startup Script.
// Below is a simple .jsx script snippet you can run in AE (File > Scripts > Run Script File)
// to update footage paths based on the JSON.

/*
// SAVE THIS AS "update_images.jsx"
{
    var proj = app.project;
    var jsonItem = null;
    
    // Find the JSON file
    for (var i = 1; i <= proj.numItems; i++) {
        if (proj.item(i).name.indexOf(".json") > 0) {
            jsonItem = proj.item(i);
            break;
        }
    }

    if (jsonItem) {
        var jsonFile = new File(jsonItem.file.fsName);
        jsonFile.open('r');
        var str = jsonFile.read();
        jsonFile.close();
        var data = JSON.parse(str).data;

        // Loop through data and find images
        for (var key in data) {
            // Check if value ends with png/jpg
            if (data[key].match(/\.(jpg|jpeg|png)$/i)) {
                // Find footage item with same name as Key (or some convention)
                // This part requires you to name your AE footage items same as the Fields!
                for (var j = 1; j <= proj.numItems; j++) {
                    if (proj.item(j).name == key) {
                         // We assume images are in the same folder as the .json
                        var newPath = jsonItem.file.parent.fsName + "/" + data[key];
                        proj.item(j).replaceCamera(new File(newPath)); // replaceCamera works for footage too usually, or replace()
                        proj.item(j).replace(new File(newPath));
                    }
                }
            }
        }
        alert("Images Updated!");
    } else {
        alert("JSON file not found in project bin!");
    }
}
*/
