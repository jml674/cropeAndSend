$(document).ready(function() {
	
	$("#chooseFile").click(function() {
		$("#file").click();
	});
	
	$("#file").change(function() {
		var file = this.files[0];
		console.log(file);
		var fileReader = new FileReader();
		
		fileReader.onloadend = function() {
			openEditor(this.result, true);
		}
		
		fileReader.onabort = fileReader.onerror = function() {
			switch (this.error.code) {
			case FileError.NOT_FOUND_ERR:
				alert("File not found!");
				break;
			case FileError.SECURITY_ERR:
				alert("Security error!");
				break;
			case FileError.NOT_READABLE_ERR:
				alert("File not readable!");
				break;
			case FileError.ENCODING_ERR:
				alert("Encoding error in file!");
				break;
			default:
				alert("An error occured while reading the file!");
				break;
			}

		}
		
		fileReader.readAsDataURL(file);
	});	
	
});