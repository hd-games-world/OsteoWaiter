// ============================================================
//  OsteoWaiter — Rename Layers & Export Assets (Cropped)
//  كل طبقة تُصدَّر بحجمها الفعلي فقط، لا بحجم الـ Canvas
// ============================================================

#target photoshop

var NAME_MAP = {
    "pelvis"         : "pelvis",
    "torso"          : "torso",
    "head"           : "head",
    "cup"            : "cup",
    "tray"           : "tray",
    "l-hand"         : "l-hand",
    "r-hand"         : "r-hand",
    "l-humerus"      : "l-upper-arm",
    "r-humerus"      : "r-upper-arm",
    "l-radius-ulna"  : "l-lower-arm",
    "r-radius-ulna"  : "r-lower-arm",
    "l-fumur"        : "l-upper-leg",
    "r-fumur"        : "r-upper-leg",
    "l-tibia-fibula" : "l-lower-leg",
    "r-tibia-fibula" : "r-lower-leg",
    "ankle-l-foot"   : "l-foot",
    "ankle-r-foot"   : "r-foot",
    "Layer-1"        : "neck",
    "Layer-2"        : "UNKNOWN_VERIFY_ME"
};

var doc = app.activeDocument;
var psdFolder = doc.path;
var outputFolder = new Folder(psdFolder + "/assets");
if (!outputFolder.exists) outputFolder.create();

// ============================================================
//  التصدير المحسّن: يقطع الشفافية ويحفظ بحجم المحتوى فقط
// ============================================================
function exportLayerCropped(layer, exportName) {
    if (exportName === "UNKNOWN_VERIFY_ME") {
        $.writeln("⏭  تخطي: " + layer.name);
        return;
    }

    // انسخ الوثيقة بالكامل (مع كل الطبقات)
    var tempDoc = doc.duplicate(exportName + "_TEMP", true);

    try {
        // أخفِ كل الطبقات في النسخة
        hideAllInDoc(tempDoc.layers);

        // أظهر الطبقة المستهدفة فقط (ابحث عنها بالاسم)
        var targetLayer = findLayerByName(tempDoc.layers, layer.name);
        if (!targetLayer) {
            $.writeln("⚠️  لم تُوجد الطبقة في النسخة: " + layer.name);
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);
            return;
        }
        targetLayer.visible = true;
        showParentsInDoc(targetLayer);

        // اسطّح النسخة
        tempDoc.flatten();

        // ✂️ القلب: اقطع الشفافية من كل الجهات
        tempDoc.trim(TrimType.TRANSPARENT, true, true, true, true);

        // صدّر PNG-24
        var pngOptions = new PNGSaveOptions();
        pngOptions.compression = 6;
        pngOptions.interlaced = false;

        var saveFile = new File(outputFolder + "/" + exportName + ".png");
        tempDoc.saveAs(saveFile, pngOptions, true, Extension.LOWERCASE);

        $.writeln("📦 " + exportName + ".png  [" +
            tempDoc.width + " × " + tempDoc.height + "]");
    } catch(e) {
        $.writeln("❌ خطأ في تصدير " + exportName + ": " + e.message);
    } finally {
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    }
}

// ============================================================
//  دوال مساعدة
// ============================================================

function hideAllInDoc(layers) {
    for (var i = 0; i < layers.length; i++) {
        layers[i].visible = false;
        if (layers[i].typename === "LayerSet") {
            hideAllInDoc(layers[i].layers);
        }
    }
}

// بحث عودي عن طبقة بالاسم
function findLayerByName(layers, name) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].name === name) return layers[i];
        if (layers[i].typename === "LayerSet") {
            var found = findLayerByName(layers[i].layers, name);
            if (found) return found;
        }
    }
    return null;
}

// أظهر كل الآباء حتى تظهر الطبقة
function showParentsInDoc(layer) {
    var parent = layer.parent;
    while (parent && parent.typename !== "Document") {
        parent.visible = true;
        parent = parent.parent;
    }
}

// إعادة تسمية عودية
function walkAndRename(layerSet) {
    var layers = layerSet.layers;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        for (var key in NAME_MAP) {
            if (layer.name === key) {
                if (NAME_MAP[key] !== "UNKNOWN_VERIFY_ME") {
                    $.writeln("✏️  " + layer.name + " → " + NAME_MAP[key]);
                    layer.name = NAME_MAP[key];
                } else {
                    $.writeln("⚠️  " + layer.name + " غير محددة، تخطي إعادة التسمية");
                }
                break;
            }
        }
        if (layer.typename === "LayerSet") walkAndRename(layer);
    }
}

// تصدير عودي لكل الطبقات
function walkAndExport(layerSet) {
    var layers = layerSet.layers;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var exportName = NAME_MAP[layer.name] || layer.name;

        // صدّر سواء كانت مجموعة أو طبقة عادية
        exportLayerCropped(layer, exportName);

        // ادخل داخل المجموعات لتصدير الأعضاء الفرعية أيضاً
        if (layer.typename === "LayerSet") {
            walkAndExport(layer);
        }
    }
}

// ============================================================
//  التنفيذ
// ============================================================
$.writeln("\n=== بدء السكريبت ===");
$.writeln("المستند: " + doc.name);
$.writeln("الإخراج: " + outputFolder.fsName);

$.writeln("\n[1] إعادة التسمية في PSD...");
// ملاحظة: إعادة التسمية أولاً تعني أن NAME_MAP يجب أن يبحث
// بالأسماء القديمة، لذا نصدّر أولاً ثم نعيد التسمية
$.writeln("\n[1] التصدير بالأحجام الفعلية...");
walkAndExport(doc);

$.writeln("\n[2] إعادة تسمية الطبقات في PSD...");
// أعد تحميل الخريطة للبحث بالأسماء الأصلية
walkAndRename(doc);
doc.save();

$.writeln("\n=== اكتمل ✓ ===");
alert("اكتمل التصدير!\n\nكل صورة مقطوعة بحجمها الفعلي.\nالمجلد: " + outputFolder.fsName + "\n\n⚠️ راجع Layer-2 يدوياً.");
