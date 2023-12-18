import dcmjs from "../src/index.js";
import fs from "fs";
import { validationLog } from "./../src/log.js";

// Ignore validation errors
validationLog.level = 5;

const { DicomMessage } = dcmjs.data;
const { cleanTags, getTagsNameToEmpty } = dcmjs.anonymizer;

it("test_export", () => {
    expect(typeof cleanTags).toEqual("function");
});

it("test_anonymization", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-dicom.dcm").buffer;
    const dicomDict = DicomMessage.readFile(arrayBuffer);

    const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap["PatientName"];
    const tagNumber = tagInfo.tag,
        tagString = dcmjs.data.Tag.fromPString(tagNumber).toCleanString();

    const patientIDTag = dicomDict.dict[tagString];
    const patientIDValue = patientIDTag.Value;

    expect(JSON.stringify(patientIDValue)).toEqual(
        JSON.stringify([{ Alphabetic: "Fall 3" }])
    );
    expect(patientIDValue.toString()).toEqual(["Fall 3"].toString());

    // when
    cleanTags(dicomDict.dict);

    // then
    expect(JSON.stringify(patientIDTag.Value)).toEqual(
        JSON.stringify([{ Alphabetic: "ANON^PATIENT" }])
    );
    expect(patientIDTag.Value.toString()).toEqual(["ANON^PATIENT"].toString());
});

it("test_anonymization_no_change_ref", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-sr.dcm").buffer;
    const dicomDict = DicomMessage.readFile(arrayBuffer);

    // multiple value name
    const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap["OtherPatientNames"];
    const tagNumber = tagInfo.tag,
        tagString = dcmjs.data.Tag.fromPString(tagNumber).toCleanString();

    const otherPatientNamesIDTag = dicomDict.dict[tagString];
    const otherPatientNamesIDValue = otherPatientNamesIDTag.Value;
    const otherPatientNamesIDValueJSON = JSON.stringify(
        otherPatientNamesIDValue
    );

    expect(JSON.stringify(otherPatientNamesIDValue)).toEqual(
        JSON.stringify([
            {
                Alphabetic: "Doe^John",
                Ideographic: "Johnny",
                Phonetic: "Jonny"
            },
            { Alphabetic: "Doe^Jane", Ideographic: "Janie", Phonetic: "Jayne" }
        ])
    );
    expect(otherPatientNamesIDValue.toString()).toEqual(
        ["Doe^John=Johnny=Jonny\\Doe^Jane=Janie=Jayne"].toString()
    );

    // when
    cleanTags(dicomDict.dict, { "00101001": "ANON^PATIENT" });

    // then
    expect(JSON.stringify(otherPatientNamesIDTag.Value)).toEqual(
        JSON.stringify([{ Alphabetic: "ANON^PATIENT" }])
    );
    expect(otherPatientNamesIDTag.Value.toString()).toEqual(
        ["ANON^PATIENT"].toString()
    );

    expect(JSON.stringify(otherPatientNamesIDValue)).toEqual(
        otherPatientNamesIDValueJSON
    );
});

it("test_anonymization_tagtoreplace_param", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-dicom.dcm").buffer;
    const dicomDict = DicomMessage.readFile(arrayBuffer);

    const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap["PatientName"];
    const tagNumber = tagInfo.tag,
        tagString = dcmjs.data.Tag.fromPString(tagNumber).toCleanString();

    const patientNameTag = dicomDict.dict[tagString];
    const patientNameValue = patientNameTag.Value;

    expect(JSON.stringify(patientNameValue)).toEqual(
        JSON.stringify([{ Alphabetic: "Fall 3" }])
    );
    expect(patientNameValue.toString()).toEqual(["Fall 3"].toString());

    var tagsToReplace = {
        "00100010": "REPLACE^PATIENT"
    };
    // when
    cleanTags(dicomDict.dict, tagsToReplace);

    // then

    expect(JSON.stringify(patientNameTag.Value)).toEqual(
        JSON.stringify([{ Alphabetic: "REPLACE^PATIENT" }])
    );
    expect(patientNameTag.Value.toString()).toEqual(
        ["REPLACE^PATIENT"].toString()
    );
});

it("test_anonymization_keep_tag", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-dicom.dcm").buffer;
    const dicomDict = DicomMessage.readFile(arrayBuffer);

    const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap["SeriesDescription"];
    const tagNumber = tagInfo.tag,
        tagString = dcmjs.data.Tag.fromPString(tagNumber).toCleanString();

    const seriesDescriptionTag = dicomDict.dict[tagString];
    const seriesDescriptionValue = seriesDescriptionTag.Value;

    expect(seriesDescriptionValue).toEqual(["Oberbauch  *sSSH/FB/4mm"]);

    var tagsToReplace = {};
    var tagsToKeep = getTagsNameToEmpty();
    var seriesDescription = "SeriesDescription";
    if (tagsToKeep.indexOf(seriesDescription) != -1) {
        tagsToKeep.splice(tagsToKeep.indexOf(seriesDescription), 1);
    }

    // when
    cleanTags(dicomDict.dict, tagsToReplace, tagsToKeep);

    // then
    expect(seriesDescriptionTag.Value).toEqual(["Oberbauch  *sSSH/FB/4mm"]);
});

it("test_anonymization_anonymize_tag", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-dicom.dcm").buffer;
    const dicomDict = DicomMessage.readFile(arrayBuffer);

    const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap["SeriesInstanceUID"];
    const tagNumber = tagInfo.tag,
        tagString = dcmjs.data.Tag.fromPString(tagNumber).toCleanString();

    const SeriesInstanceUIDTag = dicomDict.dict[tagString];
    const SeriesInstanceUIDValue = SeriesInstanceUIDTag.Value;

    expect(SeriesInstanceUIDValue).toEqual([
        "1.2.276.0.50.192168001092.11156604.14547392.303"
    ]);

    var tagsToReplace = {};
    var tagsToAnon = getTagsNameToEmpty();
    if (!tagsToAnon.includes("SeriesInstanceUID")) {
        tagsToAnon.push("SeriesInstanceUID");
    }

    // when
    cleanTags(dicomDict.dict, tagsToReplace, tagsToAnon);

    // then
    expect(SeriesInstanceUIDTag.Value).toEqual([]);
});

it.only("test_patientname_dataset_save_sampledicom", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-dicom.dcm").buffer;

    const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer);
    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
        dicomData.dict
    );
    dataset._meta = dcmjs.data.DicomMetaDictionary.namifyDataset(
        dicomData.meta
    );
    console.log("Dataset patient name before edit", dataset.PatientName);

    // when
    dataset.PatientName = [{ Alphabetic: "Fall 3 Edited" }];
    
    //then 
    expect(JSON.stringify(dataset.PatientName)).toEqual(
        JSON.stringify([{ Alphabetic: "Fall 3 Edited" }])
    );
    console.log("Dataset patient name after edit", dataset.PatientName);

    const segmentationBlob = dcmjs.data.datasetToBlob(dataset);
    new Promise(resolve => {
        let segArrayBuffer;
        var fileReader = new FileReader();
        fileReader.onload = event => {
            segArrayBuffer = event.target.result;
            const dicomData = dcmjs.data.DicomMessage.readFile(segArrayBuffer);
            const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
                dicomData.dict
            );
            dataset._meta = dcmjs.data.DicomMetaDictionary.namifyDataset(
                dicomData.meta
            );
            resolve(dataset);
        };
        fileReader.readAsArrayBuffer(segmentationBlob);
    }).then( (editedDataset) => {
        console.log("Edited dataset patient name", editedDataset.PatientName);
        expect(JSON.stringify(editedDataset.PatientName)).toEqual(
            JSON.stringify([{ Alphabetic: "Fall 3 Edited" }])
        );
    }).catch((err) => console.log('err', err));
});

it.only("test_patientname_dataset_save_sampleseg", () => {
    // given
    const arrayBuffer = fs.readFileSync("test/sample-seg.dcm").buffer;

    const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer);
    const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
        dicomData.dict
    );
    dataset._meta = dcmjs.data.DicomMetaDictionary.namifyDataset(
        dicomData.meta
    );
    console.log("Dataset patient name", dataset.PatientName);

    const segmentationBlob = dcmjs.data.datasetToBlob(dataset);
    new Promise(resolve => {
        let segArrayBuffer;
        var fileReader = new FileReader();
        fileReader.onload = event => {
            segArrayBuffer = event.target.result;
            const dicomData = dcmjs.data.DicomMessage.readFile(segArrayBuffer);
            const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
                dicomData.dict
            );
            dataset._meta = dcmjs.data.DicomMetaDictionary.namifyDataset(
                dicomData.meta
            );
            resolve(dataset);
        };
        fileReader.readAsArrayBuffer(segmentationBlob);
    }).then( (editedDataset) => {
        console.log("Edited dataset patient name", editedDataset.PatientName);
        expect(JSON.stringify(editedDataset.PatientName)).toEqual(
            JSON.stringify(dataset.PatientName)
        );
    }).catch((err) => console.log('err', err));
});