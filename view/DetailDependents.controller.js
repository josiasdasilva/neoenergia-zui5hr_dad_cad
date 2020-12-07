sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"autoServico/view/BaseController",
	"autoServico/formatter/Formatter",
	"autoServico/view/Anexo",
	"sap/ui/model/json/JSONModel",
], function(Controller, ResourceModel, MessageBox, BaseController, Formatter, Anexo, JSONModel) {
	"use strict";
	return BaseController.extend("autoServico.view.DetailDependents", {
		onInit: function() {

			//Set data to "Dependents Table"
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();
			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				var oEventBus = this.getEventBus();
			}

			this.changedData = [];
			var oAtt = new JSONModel({
				table: []
			});
			this.getView().setModel(oAtt, "Attachments");

			this.obligatoryChanged = false;

			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSearchHelps();
			this.fSetHeader();
			this.fSetGlobalInformation();
			this.fGetBlock();
			this.getAttachment();
		},

		//	--------------------------------------------
		//	fCheck24Years
		//	--------------------------------------------		
		fCheck24Years: function() {

			var message =
				"Não é permitido cadastrar filho/tutor/enteado/sob guarda judicial com 24 anos ou mais, exceto se for comprovada invalidez.";
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var oPlansModel = this.getView().getModel("ET_PLANS");
			var birthDate = this.getView().byId("dpDependentBirthDate").getValue();
			var invalid = this.getView().byId("cbInvalidDependent").getSelected();

			if ((memberType === "2" || memberType === "3" || memberType === "5" ||
					memberType === "6" || memberType === "14" || memberType === "16" || memberType === "90") &&
				(birthDate <= oPlansModel.oData.ESTUD_BEGDA) &&
				invalid === false) {

				MessageBox.error(message);
				return false;

			}

		},

		//	--------------------------------------------
		//	fGetLog
		//	--------------------------------------------		
		fGetLog: function() {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_RESP_DIGITAL_SRV/");
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");
			var that = this;

			this.addHighlightStyle();

			function fSuccess(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				that.getView().setModel(oValue, "ET_LOG_DEP");
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find("message").first().text();

				if (message.substring(2, 4) == "99") {
					var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
					var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
					var zMessage = formattedDetail.replace("error", "");

					MessageBox.error(zMessage);

				} else {
					MessageBox.error(message);
				}
			}

			//Shows Log only in Approval Mode
			//if (oGlobalInformation.IM_LOGGED_IN == "5" && oGlobalInformation.IM_REQUISITION_ID != "" && oGlobalInformation.IM_REQUISITION_ID !=
			//	"00000000") {
			var urlParam = this.fFillURLParamFilter("REQUISITION_ID", oGlobalInformation.IM_REQUISITION_ID);

			//MAIN READ
			oModel.read("ET_LOG", null, urlParam, false, fSuccess, fError);
			//}
		},

		//	--------------------------------------------
		//	fValidateCPF
		//	--------------------------------------------
		fValidateCPF: function(strCPF) {
			strCPF = strCPF.split('.').join('');
			strCPF = strCPF.split('-').join('');
			var Soma;
			var Resto;
			Soma = 0;
			//strCPF  = RetiraCaracteresInvalidos(strCPF,11);
			//TGE388990
			if (strCPF === "00000000000" || strCPF === "55555555555" ||
				strCPF === "11111111111" || strCPF === "66666666666" ||
				strCPF === "22222222222" || strCPF === "77777777777" ||
				strCPF === "33333333333" || strCPF === "88888888888" ||
				strCPF === "44444444444" || strCPF === "99999999999") {

				return false;
			}
			for (var i = 1; i <= 9; i++) {
				Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
			}
			Resto = (Soma * 10) % 11;
			if ((Resto == 10) || (Resto == 11)) {
				Resto = 0;
			}
			if (Resto != parseInt(strCPF.substring(9, 10))) {
				return false;
			}
			Soma = 0;
			for (var j = 1; j <= 10; j++) {
				Soma = Soma + parseInt(strCPF.substring(j - 1, j)) * (12 - j);
			}
			Resto = (Soma * 10) % 11;
			if ((Resto == 10) || (Resto == 11)) {
				Resto = 0;
			}
			if (Resto != parseInt(strCPF.substring(10, 11))) {
				return false;
			}
			return true;
		},

		//	--------------------------------------------
		//	fValidateDuplicatedCpf
		//	--------------------------------------------		
		fValidateDuplicatedCpf: function(cpf, record) {
			var oTableModel = this.getView().byId("tDependents").getModel();
			//var cpf = this.getView().byId("ipDependentCpf").getValue();
			var amountEqualsCpf = 1;
			var titularCpf = this.getView().getModel("ET_PLANS").getData().CPF_HOLDER;
			var isDuplicated;

			if (oTableModel.oData.length > 0 && cpf.trim() !== "") {
				oTableModel = oTableModel.getData();

				for (var i = 0; i < oTableModel.length; i++) {

					//Não validar o CPF do membro que está sendo delimitado como CPF já utilizado.  (regra somente para conjugue 1  e companheira 13 ).
					if ((oTableModel[i].SUBTY === "1" || oTableModel[i].SUBTY === "13") && (oTableModel[i].ACTIO_BLOCK === "DEL")) {
						continue;
					}

					if (oTableModel[i].ICNUM === cpf && i !== record ||
						cpf === titularCpf) {
						amountEqualsCpf = amountEqualsCpf + 1;
					}

				}
			}

			if (amountEqualsCpf > 1) {
				isDuplicated = true;
			} else {
				isDuplicated = false;
			}

			return isDuplicated;
		},

		//	--------------------------------------------
		//	onCPFChange
		//	--------------------------------------------
		onCPFChange: function(e) {
			this.fMessage("None", null, "ipDependentCpf");
			
			this.changedData.pop("ipDependentCpf");
			
			if (this.getView().byId("ipDependentCpf").getValue() !== "") {
				if (this.fValidateCPF(e.oSource.getValue())) {
					this.fMessage("None", null, "ipDependentCpf");
					
					//TGE388990 - Apenas para Brasil.
				//	if ( this.getView().byId("ipDependentBirthCountry").getValue() === 'BR' ){
						this.changedData.push("ipDependentCpf");
				//	}
					
				} else {
					this.fMessage("Error", "entrada_invalida", "ipDependentCpf");
				}
			} else {
				if (this.getView().byId("ipDependentCpf").getValueStateText === "Entrada Inválida") {
					this.fMessage("None", null, "ipDependentCpf");
				}
			}

			//CR - somente no enviar - 16.05
			/*			if (this.getView().byId("ipDependentCpf").getValueState() === "None") {
							if (this.fValidateDuplicatedCpf() === true) {
								this.fMessage("Error", "msg_cpf_duplicado", "ipDependentCpf");
							} else {
								this.fMessage("None", null, "ipDependentCpf");
							}
						}*/

		},
		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function() {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			function fSuccess(oEvent) {

				var results = oEvent.results[0];
				var requisitionId;
				if (oEvent.results[0].DEPENDENTS.results.length > 0) {
					requisitionId = oEvent.results[0].DEPENDENTS.results[0].REQUISITION_ID;
				}
				//Sets the models to View
				that.fSetsModels(oEvent, that);
				that.getView().byId("taJust").setValue(results.OBSERVATION);
				if (results.OBSERVATION_SSG !== null && results.OBSERVATION_SSG !== "" && results.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(results.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}

				// If there is ID, verify attachment 
				// that.getView().byId("link0").setVisible(false);
				// that.getView().byId("link1").setVisible(false);
				// that.fAttachment(requisitionId, that, true, true);

				if ((requisitionId !== null || requisitionId !== "" || requisitionId !== undefined) && requisitionId !== "00000000") {
					if (results.EX_MESSAGE.TYPE === "W" && results.IM_ACTION !== "A") {
						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.results[0].EX_MESSAGE.MESSAGE);
						}
					}
				} else {
					var oLogModel = that.getView().getModel("ET_LOG_DEP");
					if (oLogModel !== undefined) {
						oLogModel.destroy();
						that.obligatoryChanged = false;
					}
				}

				that.fSetGlobalInformation(oEvent, that, requisitionId, true);
				that.fVerifyAction();
				that.fGetLog();
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find("message").first().text();
				if (message.substring(2, 4) == "99") {
					var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
					var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
					var zMessage = formattedDetail.replace("error", "");
					that.fVerifyAllowedUser(message, that);
					MessageBox.error(zMessage);
				} else {
					MessageBox.error(message);
				}
			}
			//MAIN READ
			var urlParam = this.fFillURLParamFilter("IM_PERNR", oGlobalData.IM_PERNR);
			urlParam = this.fFillURLParamFilter("IM_REQUISITION_ID", oGlobalData.IM_REQ_URL, urlParam);
			urlParam = this.fFillURLParamFilter("IM_LOGGED_IN", oGlobalData.IM_LOGGED_IN, urlParam);
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalData.IM_BUKRS, urlParam);
			urlParam = urlParam + "&$expand=DEPENDENTS";
			oModel.read("ET_DEPENDENTS", null, urlParam, false, fSuccess, fError);

		},
		//	--------------------------------------------
		//	fAttachment
		//	--------------------------------------------		
		fAttachment: function(requisitionId, that, anexo, docBen) {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			if (requisitionId !== "00000000" && requisitionId !== undefined) {

				// anexos
				if (anexo) {
					var filters = [];
					var sFilter;
					sFilter = new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, requisitionId);
					filters.push(sFilter);
					that.getView().setModel(oModel, "anexo");
					// Update list binding
					that.getView().byId("upldAttachments").getBinding("items").filter(filters);

				}

				// anexos gerados ecc
				if (docBen) {
					var urlParam = this.fFillURLParamFilter("IDREQ", requisitionId);
					urlParam = this.fFillURLParamFilter("TOKENKEY", "X", urlParam);
					oModel.read("ET_DMS", null, urlParam, false, fSuccess, fError);

					function fSuccess(oEvent) {

						var count = oEvent.results.length;

						for (var i = 0; i < count; i++) {
							that.getView().byId("link" + i).setVisible(true);
							that.getView().byId("link" + i).setHref(oEvent.results[i].URL);
							that.getView().byId("link" + i).setText(oEvent.results[i].FILENAME);
						}

					}

					function fError(oEvent) {
						console.log("ERRO DOC BEN");
					}
				}

			}
		},

		//	--------------------------------------------
		//	onDependentBirthCountry 
		//	--------------------------------------------		
		onDependentBirthCountry: function() {
			this.fVerifyBornAliveMandatory();

			//Begin - TGE388990
			this.validateRegionBirthCountry();
			

		},

		//	--------------------------------------------
		//	fVerifyBornAliveMandatory
		//	--------------------------------------------		
		fVerifyBornAliveMandatory: function() {
			var birthDate = this.getView().byId("dpDependentBirthDate").getValue();
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var birthCoutry = this.getView().byId("ipDependentBirthCountry").getValue();

			this.getView().byId("lblDependentBornAliveNumber").setRequired(false);
			this.getView().byId("ipDependentBornAliveNumber").setRequired(false);

			if (birthDate !== null && birthDate !== "" && birthDate !== undefined && birthDate !== " ") {
				if (birthDate.substring(0, 4) >= 2010 && memberType !== "11" && memberType !== "12" &&
					birthCoutry === "BR") {
					this.getView().byId("lblDependentBornAliveNumber").setRequired(true);
					this.getView().byId("ipDependentBornAliveNumber").setRequired(true);
				}
			}
		},

		//TGE388990
		validateRegionBirthCountry: function() {

			var state_reg = true;
			var buttonInf = false;
			var memberType = this.getView().byId("slMemberType").getSelectedKey();

			if (memberType === "11" || memberType === "12") {
				var required = false;
			} else {
				required = true;
			}

			this.fSearchHelpRegion();
			//this.fSearchHelpBirthPlace();

			var tRegion = this.getView().getModel("ET_SH_REGION").getData();
			//var tLocNas = this.getView().getModel("ET_SH_LOCAL_OF_BIRTH").getData();

			if (tRegion.length === 0) {
				required = false;
				state_reg = false;
				buttonInf = true;	
			
				
				this.getView().byId("ipDependentRegion").setValue("");
				this.getView().byId("ipDependentBirthPlace").setValue("");
				this.getView().byId("ipDependentBirthPlace").setValueState(sap.ui.core.ValueState.None);
				this.getView().byId("ipDependentRegion").setValueState(sap.ui.core.ValueState.None);

			}
			
			this.getView().byId("btDependentRegion").setVisible(buttonInf);
			this.getView().byId("btDependentBirth").setVisible(buttonInf);
			
			this.getView().byId("lblDependentRegion").setRequired(required);
			this.getView().byId("ipDependentRegion").setRequired(required);
			this.getView().byId("ipDependentRegion").setEnabled(state_reg);

			this.getView().byId("lblDependentBirthPlace").setRequired(required);
			this.getView().byId("ipDependentBirthPlace").setRequired(required);
			this.getView().byId("ipDependentBirthPlace").setEnabled(state_reg);

		},
		

		//	--------------------------------------------
		//	fSetsModels
		//	--------------------------------------------
		fSetsModels: function(oEvent, that) {
			var oTable = that.getView().byId("tDependents");
			//PLANS
			var oModelPlans = new sap.ui.model.json.JSONModel(oEvent.results[0].PLANS_INFO);
			that.getView().setModel(oModelPlans, "ET_PLANS");
			//GLOBAL MODEL
			var oModelAux = new sap.ui.model.json.JSONModel(oEvent.results[0].DEPENDENTS);
			var oDependents = JSON.parse(JSON.stringify(oModelAux.oData.results));
			var oModelDependents = new sap.ui.model.json.JSONModel(oDependents);
			that.getView().setModel(oModelDependents, "ET_DEPENDENTS");
			//TABLE MODEL
			var oModelDependentsTable = new sap.ui.model.json.JSONModel(oEvent.results[0].DEPENDENTS.results);
			oTable.setModel(oModelDependentsTable);
			oTable.bindRows("/");

			if (oModelDependentsTable.oData.length == 0) {
				this.fFooterButtonsAttribute(false, "X");
				that.getView().byId("btnSaveAction").setVisible(false);
				that.getView().byId("btnCancelAction").setVisible(false);
			}
		},

		//	--------------------------------------------
		//	onAction
		//	--------------------------------------------
		onAction: function(oEvent) {
			var oButtonName = oEvent.getParameter("id").substring(12);
			var oModelDependentsTable = this.getView().byId("tDependents").getModel();
			var oAction = this.getView().getModel("ET_ACTION");
			var error = false;
			var allowedToInsert = true;

			switch (oButtonName) {
				case "btnCancelAction":
					//Gets the original model and set it to the current row in the table model
					//If it's an insertion, it doesn't have an original model, so it's not necessary to reset the data (just ignore the inputed values)
					if (oAction.oData.ACTION !== "INS") {
						this.fResetModel();
					}
					break;
				case "btnSaveAction":
					//Allows user to save only if no errors occured 
					error = this.fValidInputFields();

					if (error === false) {
					
						if (oAction.oData.ACTION === "INS") {

							//Does not allow to insert a partner without delimiting the existing one
							allowedToInsert = this.fPartnerValidation();
						}
						if (oAction.oData.ACTION === "INS" || oAction.oData.ACTION === "MOD") {

							//TGE388990
							var attachment = this.validAttachmentDep(oAction.oData.ACTION);

							if (attachment === false) {
								this.handleErrorMessageAttachment();
								return;
							}

							//check 24years old
							allowedToInsert = this.fCheck24Years();

						}

						if (allowedToInsert !== false) {
							if (this.fUpdateRecord() === false) {
								return;
							}
						} else {
							return;
						}
					}
			}

			//Continue if there is no errors
			if (error === false) {
				this.changedData = []; //TGE388990
				
				if (this.fGetSelectedRow() === true) {
					//Modifying record
					this.fActionButtonsAttribute(true, true);
				} else {
					//Creating record
					this.fActionButtonsAttribute(true, false);
				}
				//Sets dependents' table to visible
				this.getView().byId("formDependents").setVisible(true);

				//Sets dependents' form to invisible
				this.fSetDependentsFieldsAttribute(false);

				this.fActionButtonsDataAttribute(false);

				//Allow user to use the footer buttons, such as Save, Send, Cancel, Sane, etc...
				this.fFooterButtonsAttribute(true);

				if (oModelDependentsTable.oData.length == 0) {
					this.fFooterButtonsAttribute(false, "X");
				} else {
					//Removes table row selection 
					this.getView().byId("tDependents").setSelectedIndex(-1);
				}

			}
		},

		//TGE388990
		validAttachmentDep: function(Op) {
			var invalid = this.getView().byId("cbInvalidDependent").getSelected();
			var student = this.getView().byId("cbStudentDependent").getSelected();
			var depImp  = this.getView().byId("cbDependentIncomeTax").getSelected();
			var cpf	    = this.getView().byId("ipDependentCpf").getValue();
			var result  = this.getView().getModel("Attachments").getData().table;
			var anexos  = this.getView().byId('tAnexos').getRows();
			var uploadCollection = "";
			
			var member = this.getView().byId("slMemberType").getSelectedKey();
			
			var lvReturn = false;
			
			var changedData = this.removeDuplicates(this.changedData);
			
			for(var i=0;i<changedData.length;i++ ){
				switch (changedData[i]) {
					case "cbInvalidDependent": 
						var valid_invalid = true;
						break;
					case "cbStudentDependent": 
						var valid_student = true;
						break;	
					case "cbDependentIncomeTax": 
						var valid_depImp = true;
						break;	
					case "ipDependentCpf": 
						var valid_cpf = true;
						break;		

				}		
			}
			
			
			if(valid_cpf){ 
				if( member === "5" || member === "2" || member === "6" || member === "14" || member === "1" ) {
					if (result.length > 0){
						for (i = 0; i < result.length; i++) {
								if (result[i].TipoAnexo === "CPFFILHOS" || 
								    result[i].TipoAnexo === "CNHHABILI" ||
								    result[i].TipoAnexo === "RG" ) {
									
									uploadCollection = anexos[i].getCells()[1].getItems()[0];
									if( uploadCollection.getValue() !== ""){
										lvReturn = true;
									}
								}
						}
					}
				
				}else{
					lvReturn = true;	
				}
				
				if (lvReturn === false) {
						return false;
				}else{
					lvReturn = false;
				}
										
			}else{
				lvReturn = true;
			}
			
			
			if (valid_invalid){ 
				lvReturn = false;
				if (invalid === true) {
					for (i = 0; i < result.length; i++) {
						if (result[i].TipoAnexo === "INVALIDEZ") {
							uploadCollection = anexos[i].getCells()[1].getItems()[0];
							if( uploadCollection.getValue() !== ""){
								lvReturn = true;
							}
						//	lvReturn = true;
						}
					}
				} else {
					lvReturn = true;
				}
	
				if (lvReturn === false) {
					return false;
				}
				
			}else{
				lvReturn = true;
			}
			

			if (valid_student){
				lvReturn = false;
					
				if (student === true) {
					for (i = 0; i < result.length; i++) {
						if (result[i].TipoAnexo === "ENSINOSUPERIOR") {
							uploadCollection = anexos[i].getCells()[1].getItems()[0];
							if( uploadCollection.getValue() !== ""){
								lvReturn = true;
							}
						//	lvReturn = true;
						}
					}
				} else {
					lvReturn = true;
				}
	
				if (lvReturn === false) {
					return false;
				}

			}else{
				lvReturn = true;
			}
		
			if (valid_depImp){
				lvReturn = false;
				
				if (depImp === true) {
					for (i = 0; i < result.length; i++) {
						if (result[i].TipoAnexo === "CPF") {
							uploadCollection = anexos[i].getCells()[1].getItems()[0];
							if( uploadCollection.getValue() !== ""){
								lvReturn = true;
							}
							//lvReturn = true;
						}
					}
				} else {
					lvReturn = true;
				}
			}else{
				lvReturn = true;
			}

			return lvReturn;

		},
		
		removeDuplicates: function(arr) {
		  var clean = [];
		  var cleanLen = 0;
		  var arrLen = arr.length;
		
		  for (var i = 0; i < arrLen; i++) {
		    var el = arr[i];
		    var duplicate = false;
		
		    for (var j = 0; j < cleanLen; j++) {
		      if (el !== clean[j]){ 
		      	continue;
		      }
		      
		      duplicate = true;
		      break;
		    }
		
		    if (duplicate){
		    	continue;	
		    } 
		    
		    clean[cleanLen++] = el;
		  }
		
		  return clean;
		},
		
		
		//	--------------------------------------------
		//	onFieldChange
		//	--------------------------------------------		
		onFieldChange: function(oEvent) {
			var field = oEvent.getParameter("id").substring(12);
			this.changedData.push(field);

			//this.fValidationObligatoryFields(field);
		},

		//	--------------------------------------------
		//	fRequiredFields
		//	--------------------------------------------		
		fRequiredFields: function() {
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var required;
			var oView = this.getView();

			if (memberType === "11" || memberType === "12") {
				required = false;
			} else {
				required = true;
			}

			oView.byId("lblSex").setRequired(required);
			oView.byId("lblDependentBirthCountry").setRequired(required);
			oView.byId("lblDependentNationality").setRequired(required);
			oView.byId("lblDependentRegion").setRequired(required);
			oView.byId("lblDependentBirthPlace").setRequired(required);
			oView.byId("lblDependentsMothersName").setRequired(required);
			oView.byId("ipDependentBirthCountry").setRequired(required); 
			oView.byId("ipDependentNationality").setRequired(required);
			//oView.byId("ipDependentRegion").setRequired(required);      //TGE388990  
			//oView.byId("ipDependentBirthPlace").setRequired(required);
			oView.byId("ipDependentsMothersName").setRequired(required);
			
			//TGE388990
			this.validateRegionBirthCountry();
			//TGE388990
			
			this.fMessage("None", null, "dpDependentBirthDate");
			this.fMessage("None", null, "ipDependentBirthCountry");
			this.fMessage("None", null, "ipDependentNationality");
			this.fMessage("None", null, "ipDependentRegion");
			this.fMessage("None", null, "ipDependentBirthPlace");
			this.fMessage("None", null, "ipDependentsMothersName");
			this.fMessage("None", null, "ipDependentFullName");
			this.fMessage("None", null, "ipDependentCpf");
			this.fMessage("None", null, "ipDependentBornAliveNumber");
		},

		//	--------------------------------------------
		//	onFieldLiveChange
		//	--------------------------------------------		
		onFieldLiveChange: function(oEvent) {
			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);
			this.fConvertToUppercase(fieldName);
			// this.getView().byId("btnSanity").setVisible(false);
		},
		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function() {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			this.fSetSearchHelpValue(oModel, "ET_SH_COUNTRY");
			this.fSetSearchHelpValue(oModel, "ET_SH_NATIONALITY");
			this.fSetSearchHelpValue(oModel, "ET_SH_DEPENDENTS");
		},
		//--------------------------------------------
		//	fHelpRequest
		//--------------------------------------------		
		fHelpRequest: function(key, descriptionKey, cols, modelName, that, title, screenKeyField, screenTextField, onlyDesc, onlyKey) {
			var oScreenKeyField = that.getView().byId(screenKeyField);
			var oScreenTextField = that.getView().byId(screenTextField);
			that._oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				supportRanges: false,
				supportRangesOnly: false,
				supportMultiselect: false,
				key: key,
				descriptionKey: descriptionKey,
				ok: function(oEvent) {
					var aTokens = oEvent.getParameter("tokens");
					//Set values into others corresponding fiels in screen
					if (onlyDesc === false) {
						oScreenKeyField.setValue(aTokens[0].getProperty("key"));
						oScreenTextField.setText(aTokens[0].getProperty("text"));
					} else {
						if (onlyKey === true) {
							oScreenKeyField.setValue(aTokens[0].getProperty("key"));
						} else {
							oScreenKeyField.setValue(aTokens[0].getProperty("text"));
						}
					}
					this.close();
				},
				cancel: function() {
					this.close();
				}
			});
			//Set columns to the Search Help creation 
			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setData({
				cols: cols
			});
			//Clear any messages it may have
			this.fMessage("None", null, screenKeyField);
			//Create the Search Help columns structure
			var oTable = this._oValueHelpDialog.getTable();
			oTable.setModel(oColModel, "columns");
			//Create contens (on test purpose) and bind it to the Search Help 
			var oModel = this.getView().getModel(modelName);
			oTable.setModel(oModel);
			oTable.bindRows("/");
			//Set title and open dialog
			that._oValueHelpDialog.setTitle(title);
			this._oValueHelpDialog.open();
		},
		//	--------------------------------------------
		//	fValidationObligatoryFields
		//	--------------------------------------------
		fValidationObligatoryFields: function(field) {
			var fieldValue = this.getView().byId(field).getValue();
			var fieldState = this.getView().byId(field);

			//Validate the field if it's enabled on the screen
			if (fieldState.getEditable() === true && fieldState.getRequired() === true) {
				if (fieldValue === undefined || fieldValue === "") {
					this.fMessage("Error", "campo_obrigatorio", field);
				} else {
					if (fieldState.getProperty("valueState") === "Error" &
						fieldState.getProperty("valueStateText") === "Campo obrigatório") {
						this.fMessage("None", null, field);
					}
				}
			}
		},
		//	--------------------------------------------
		//	fGetSelectedRow
		//	--------------------------------------------	
		fGetSelectedRow: function() {
			//Verify if there is one line selected before continuing
			if (this.getView().byId("tDependents").getSelectedIndex() < 0) {
				return false; //error
			} else {
				return true; //success
			}
		},
		//	--------------------------------------------
		//	fSetDependentsFieldsAttribute
		//	--------------------------------------------		
		fSetDependentsFieldsAttribute: function(visible, delimitAtrib, editable) {
			var oView = this.getView();
			oView.byId("formDependentsDetail").setVisible(visible);
			oView.byId("formDependentsEligibilities").setVisible(visible);
			// oView.byId("formDependentsBenefits").setVisible(visible);
			// oView.byId("formDependentsFiles").setVisible(visible);

			oView.byId("slMemberType").setEnabled(false);

			if (visible === true) {
				var selectedRow = this.fGetSelectedRowDetail();

				//If it's a new record, allows to change the dependent type
				if (selectedRow !== undefined && selectedRow.STATUS === "Novo" && editable === true) {
					oView.byId("slMemberType").setEnabled(true);
				}

				//Make fields closed to edition
				oView.byId("ipDependentFullName").setEditable(editable);
				oView.byId("ipDependentBirthPlace").setEditable(editable);
				oView.byId("ipDependentBirthCountry").setEditable(editable);
				oView.byId("ipDependentNationality").setEditable(editable);
				oView.byId("ipDependentRegion").setEditable(editable);
				oView.byId("ipDependentBornAliveNumber").setEditable(editable);
				oView.byId("ipDependentsMothersName").setEditable(editable);
				oView.byId("ipDependentCpf").setEditable(editable);
				oView.byId("dpDependentBirthDate").setEditable(editable);
				oView.byId("rbgSex").setEnabled(editable);
				oView.byId("cbInvalidDependent").setEnabled(editable);
				oView.byId("cbStudentDependent").setEnabled(editable);
				oView.byId("cbDependentFamilySalary").setEnabled(editable);
				oView.byId("cbDependentIncomeTax").setEnabled(editable);
				oView.byId("ipMatricula").setEditable(editable);
				oView.byId("ipNRegistro").setEditable(editable);
				oView.byId("ipNLivro").setEditable(editable);
				oView.byId("ipNFolha").setEditable(editable);
			} else {
				return;
			}

			this.fQuickViewMemberHelpVisibility();
		},

		//	--------------------------------------------
		//	fQuickViewMemberHelpVisibility
		//	--------------------------------------------		
		fQuickViewMemberHelpVisibility: function() {

			if (this.getView().byId("slMemberType").getSelectedKey() === "11" ||
				this.getView().byId("slMemberType").getSelectedKey() === "12") {

				this.getView().byId("btnQuickViewMember").setVisible(true);

			} else {
				this.getView().byId("btnQuickViewMember").setVisible(false);
			}

		},

		//	--------------------------------------------
		//	fActionButtonsAttribute
		//	--------------------------------------------		
		fActionButtonsAttribute: function(create, modifyExistedOne) {
			var oView = this.getView();
			oView.byId("btnAddDep").setEnabled(create);
			oView.byId("btnModDep").setEnabled(modifyExistedOne);
			oView.byId("btnDelimitDep").setEnabled(modifyExistedOne);
		},
		//	--------------------------------------------
		//	onDependentsAction
		//	--------------------------------------------		
		onDependentsAction: function(oEvent) {
			var oButtonName = oEvent.getParameter("id").substring(12);
			var oView = this.getView();
			var buttonAction;
			var action = {};

			// oView.byId("btnSanity").setVisible(false);

			//Clear error messages
			this.fRemoveAllErrors();

			this.fSetLog();

			//Sets buttons "Save" and "Cancel" visible
			this.fActionButtonsDataAttribute(true);

			switch (oButtonName) {
				case "btnAddDep":
					//Sets dependent form visible, with no delimitation date and form editable
					this.fSetDependentsFieldsAttribute(true, false, true);
					//Make all fields of the form clear
					this.fClearFieldsToNewRecord();
					//Buttons Attributes and respective action
					buttonAction = "INS";
					break;
				case "btnModDep":
					//Sets dependent form visible, with no delimitation date and form editable
					this.fSetDependentsFieldsAttribute(true, false, true);
					//Buttons Attributes and respective action
					buttonAction = "MOD";
					break;
				case "btnDelimitDep":
					//Sets dependent form visible, with delimitation date and form NOT editable
					this.fSetDependentsFieldsAttribute(true, true, false);
					//Buttons Attributes and respective action
					buttonAction = "DEL";
					break;
			}
			//Footer Buttos, such as Save, Send, Cancel are not allowed in the form edition
			this.fFooterButtonsAttribute(false);

			//Sets dependent's table invisible
			oView.byId("formDependents").setVisible(false);

			//Sets to a local model the action executed by the user (INS, MOD or DEL)
			action.ACTION = buttonAction;
			var actionModel = new sap.ui.model.json.JSONModel(action);
			oView.setModel(actionModel, "ET_ACTION");

			if (buttonAction === "INS") {
				var selectedRow = this.fGetNewRow();
				var oModelRow = new sap.ui.model.json.JSONModel(selectedRow);
				oView.setModel(oModelRow, "ET_NEW_ROW");
				this.fSetNRegStatus("");
			}

			// if (this.fMemberTypeValidation() === true) {
			// 	this.fBenefits(true);
			// } else {
			// 	this.fBenefits(false);
			// }

			if (buttonAction !== "DEL") {
				this.fElegibilityAttributes();
				this.fStudentValidation();
			}

			this.fRequiredFields();
			this.fQuickViewMemberHelpVisibility();

			if (buttonAction === "DEL") {
				var memberTypeSelected = this.getView().byId("slMemberType").getSelectedKey();
				if ((memberTypeSelected === "1" || memberTypeSelected === "2") && this.fValidAttachment() === false) {
					if (memberTypeSelected === "1") {
						MessageBox.warning(
							"Não se esqueça de incluir o termo de exclusão de cônjuge (disponível em anexo) e alterar seu estado civil em Dados Pessoais");
					} else {
						MessageBox.warning("Não se esqueça de incluir o termo de exclusão de filho(a)/enteado(a) (disponível em anexo)");
					}

				}
			}
		},
		// --------------------------------------------
		// fPartnerValidation
		// --------------------------------------------		
		fPartnerValidation: function() {
			var oModel = this.getView().byId("tDependents").getModel().getData();
			var memberTypeSelected = this.getView().byId("slMemberType").getSelectedKey();
			var allowInsert;
			this.getView().byId("btnSaveAction").setVisible(true);
			if (memberTypeSelected === "1") {
				for (var i = 0; i < oModel.length; i++) {
					if (oModel[i].SUBTY === "1") {
						if (oModel[i].ACTIO_BLOCK === "DEL" || oModel[i].STATUS === "Excluído") {
							allowInsert = true;
							continue;
						} else {
							allowInsert = false;
						}
					}
				}
				if (allowInsert === false) {
					this.getView().byId("btnSaveAction").setVisible(false);
					MessageBox.error(
						"Registro de cônjuge já existente. Para nova inclusão, realize antes a exclusão do cadastro atual no bloco Dependentes");
					return false;
				}
			}
		},
		// --------------------------------------------
		// fElegibilityAttributes
		// -------------------------------------------- 
		fElegibilityAttributes: function() {
			//CR - dia 24.05 - Todos os checkbox sempre abertos
			/*			var memberType = this.getView().byId("slMemberType").getSelectedKey();
						var oView = this.getView();

						if (memberType === "2" || memberType === "6") { //Son and Stepson
							oView.byId("cbInvalidDependent").setEnabled(true);
							oView.byId("cbDependentFamilySalary").setEnabled(true);
							oView.byId("cbDependentIncomeTax").setEnabled(true);
						} else if (memberType === "1" || memberType === "13" || memberType === "5" || memberType === "90" || memberType === "11" ||
							memberType === "12") { //Spouse, Partner or Tutor//Under judicial custody//Father//Mother
							oView.byId("cbInvalidDependent").setEnabled(false);
							oView.byId("cbStudentDependent").setEnabled(false);
							oView.byId("cbDependentFamilySalary").setEnabled(false);
							oView.byId("cbDependentIncomeTax").setEnabled(true);
						} else { //Others
							oView.byId("cbInvalidDependent").setEnabled(false);
							oView.byId("cbStudentDependent").setEnabled(false);
							oView.byId("cbDependentFamilySalary").setEnabled(false);
							oView.byId("cbDependentIncomeTax").setEnabled(false);
						}

						if (oView.byId("cbInvalidDependent").getEnabled() === false) {
							oView.byId("cbInvalidDependent").setSelected(false);
						}

						if (oView.byId("cbStudentDependent").getEnabled() === false) {
							oView.byId("cbStudentDependent").setSelected(false);
						}

						if (oView.byId("cbDependentFamilySalary").getEnabled() === false) {
							oView.byId("cbDependentFamilySalary").setSelected(false);
						}

						if (oView.byId("cbDependentIncomeTax").getEnabled() === false) {
							oView.byId("cbDependentIncomeTax").setSelected(false);
						}*/

		},
		//	--------------------------------------------
		//	onEligibilitiesCBSelect
		//	--------------------------------------------		
		onEligibilitiesCBSelect: function(oEvent) {
			var checkboxId = oEvent.getParameter("id").substring(12);
			var message;
			if (this.getView().byId(checkboxId).getSelected() === true) {
				switch (checkboxId) {
					case "cbInvalidDependent":
						message = "Necessário anexar documento do INSS atestando a invalidez do dependente";
						this.changedData.push(checkboxId);
						break;
					case "cbStudentDependent":
						message = "Necessário anexar documento comprobatório";
						this.changedData.push(checkboxId);
						break;
					case "cbDependentIncomeTax": //TGE388990
						message = "Necessário anexar documento comprobatório";
						this.changedData.push(checkboxId);
						this.onSelectImposto();
						break;
				
								
				}
				
					
				MessageBox.warning(message);
			}else{
				this.changedData.pop(checkboxId);	//TGE388990
			}
			// if (checkboxId === "cbStudentDependent" || checkboxId === "cbInvalidDependent") {
			// 	if (this.fMemberTypeValidation() === true) {
			// 		this.fBenefits(true);
			// 	} else {
			// 		this.fBenefits(false);
			// 	}
			// }

			this.fCPFValidation();
		},

		//	--------------------------------------------
		//	fBenefits
		//	--------------------------------------------		
		fBenefits: function(hasRighttoBenefits) {
			var oView = this.getView();
			var oModelPlan = oView.getModel("ET_PLANS").getData();
			var selectedRow;
			var action = this.getView().getModel("ET_ACTION");
			action = action.oData.ACTION;

			switch (action) {
				case "MOD":
					selectedRow = this.fGetSelectedRowDetail();
					break;

				case "INS":
					selectedRow = this.getView().getModel("ET_NEW_ROW").getData();
					break;

				case "DEL":
					selectedRow = this.fGetSelectedRowDetail();

					oView.byId("btnCancelHealthInsurance").setVisible(false);
					oView.byId("btnCancelDentalInsurance").setVisible(false);
					oView.byId("btnAddDentalInsurance").setVisible(false);
					oView.byId("btnAddHealthInsurance").setVisible(false);
					return;
			}

			if (hasRighttoBenefits === true) {
				// this.fSetBenefitsValue(false, selectedRow);
			} else {

				selectedRow.DRUGSTORE = "";
				selectedRow.HEALTH_INSURANCE = "";
				selectedRow.DENTAL_PLAN = "";
				selectedRow.TELEMEDICINA = "";
				selectedRow.CUIDADO = "";

				oView.byId("btnCancelHealthInsurance").setVisible(false);
				oView.byId("btnCancelDentalInsurance").setVisible(false);
				oView.byId("btnAddDentalInsurance").setVisible(false);
				oView.byId("btnAddHealthInsurance").setVisible(false);
				oView.byId("ipHealthInsurance").setValue("");
				oView.byId("ipDentalInsurance").setValue("");
				oView.byId("ipDrugstore").setValue("");
				oView.byId("ipTelemedicina").setValue("");
				oView.byId("ipCuidado").setValue("");
				return;
			}

			//Resets buttons attributes
			oView.byId("btnCancelDentalInsurance").setVisible(false);
			oView.byId("btnAddDentalInsurance").setVisible(false);
			oView.byId("btnCancelHealthInsurance").setVisible(false);
			oView.byId("btnAddHealthInsurance").setVisible(false);

			if (oModelPlan.ACTIVE_HEALTH_INSURANCE === "X") {

				// O colaborador poderá excluir dos planos odonto/saúde qualquer do dependente a qq momento. 

				//A.C - 27/06
				// if (this.fVerifyObligatoryBenefit() === true) {
				// 	oView.byId("btnCancelHealthInsurance").setVisible(false);
				// 	oView.byId("btnAddHealthInsurance").setVisible(false);
				// } else {

				if (selectedRow.HEALTH_INSURANCE.trim() !== "") {
					oView.byId("btnCancelHealthInsurance").setVisible(true);
					oView.byId("btnAddHealthInsurance").setVisible(false);
				} else {
					oView.byId("btnCancelHealthInsurance").setVisible(false);

					if (oModelPlan.BPLAN_BRHE.trim() !== "") {
						oView.byId("btnAddHealthInsurance").setVisible(true);
					} else {
						oView.byId("btnAddHealthInsurance").setVisible(false);
					}
				}
				// }

			} else {
				//It's inactive
				oView.byId("btnCancelHealthInsurance").setVisible(false);
				oView.byId("btnAddHealthInsurance").setVisible(false);
			}

			//Dental
			//Already has a plan ans it's active 
			if (selectedRow.DENTAL_PLAN.trim() !== "" && oModelPlan.ACTIVE_DENTAL_PLAN === "X") {
				oView.byId("btnCancelDentalInsurance").setVisible(true);
				oView.byId("btnCancelDentalInsurance").setEnabled(true);
			} else {
				//Doesn't have a dental plan (or it's not valid), but there's a possibility of having a valid one
				if (oModelPlan.BPLAN_BRDE.trim() !== "" && oModelPlan.ACTIVE_DENTAL_PLAN === "X") {
					oView.byId("btnAddDentalInsurance").setVisible(true);
					oView.byId("btnAddDentalInsurance").setEnabled(true);
				}
			}
		},

		// --------------------------------------------
		// fVerifyObligatoryBenefit
		// --------------------------------------------		
		fVerifyObligatoryBenefit: function() {
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var birthDate = this.getView().byId("dpDependentBirthDate").getValue();
			var oPlansModel = this.getView().getModel("ET_PLANS");

			if (((memberType === "2" || memberType === "6") && birthDate > oPlansModel.oData.SON_DATE) ||
				(memberType === "90" && birthDate > oPlansModel.oData.ADULTHOOD)) {

				return true;
			} else {
				return false;
			}
		},

		// --------------------------------------------
		// onMemberTypeChange
		// --------------------------------------------			
		onMemberTypeChange: function() {
			this.fPartnerValidation();
			this.fElegibilityAttributes();
			this.fRequiredFields();
			this.fQuickViewMemberHelpVisibility();
			this.fSetNRegStatus(this.getView().byId("slMemberType").getSelectedKey());

			// if (this.fMemberTypeValidation() === true) {
			// 	this.fBenefits(true);
			// } else {
			// 	this.fBenefits(false);
			// }
		},
		// --------------------------------------------
		// fMemberTypeValidation
		// --------------------------------------------			
		fMemberTypeValidation: function() {
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var estudent = this.getView().byId("cbStudentDependent").getSelected();
			var invalid = this.getView().byId("cbInvalidDependent").getSelected();
			var birthDate = this.getView().byId("dpDependentBirthDate").getValue();
			var oPlansModel = this.getView().getModel("ET_PLANS");
			//-se for conjuge ou companheiro ou filho invalido
			//-se for filho ou enteado ou sob guarda judicial e se tiver até 
			//21 anos  ou entre 21 e 23 anos e 11 meses de idade e estudante
			if (((memberType === "1" || memberType === "13" || memberType === "5") ||
					((memberType === "2" || memberType === "6" || memberType === "90") && ((birthDate > oPlansModel.oData.SON_DATE) ||
						(birthDate <= oPlansModel.oData.ESTUD_BEGDA && estudent === true))) ||
					memberType === "2" && invalid === true) && oPlansModel.oData.APPRENTICE !== "X") {

				return true;
			} else {

				return false;
			}

		},
		// --------------------------------------------
		// fGetNewRow
		// --------------------------------------------	
		fGetNewRow: function() {
			var newRow = {};
			var oView = this.getView();
			var oGlobalData = oView.getModel("ET_GLOBAL_DATA");

			newRow.REQUISITION_ID = oGlobalData.REQUISITION_ID;
			newRow.OBJPS = "";
			newRow.FAVOR = "";
			newRow.FANAM = "";
			newRow.CARTO = "";
			newRow.NOREG = "";
			newRow.NOLIV = "";
			newRow.NOFOL = "";
			newRow.DTENT = "";
			newRow.NOREU = "";
			newRow.SUBTY = "";
			newRow.FCNAM = "";
			newRow.FGBDT = "";
			newRow.FGBLD = "";
			newRow.FANAT = "";
			newRow.FGBOT = "";
			newRow.UFBOT = "";
			newRow.ICNUM = "";
			newRow.MOTHE = "";
			newRow.LBCNR = "";
			newRow.FASEX = "";
			newRow.STINV = "";
			newRow.SALFA = "";
			newRow.IRFLG = "";
			newRow.ESTUD = "";
			newRow = this.fModifyRowModelFromView(newRow);
			//BAC - INI
			/*			newRow.ACTIO_DENTAL_PLAN = "INS";
						newRow.ACTIO_HEALTH_INSURANCE = "INS";
						newRow.ACTIO_MEDICINES = "INS";*/
			newRow.ACTIO_DENTAL_PLAN = "";
			newRow.ACTIO_HEALTH_INSURANCE = "";
			newRow.ACTIO_MEDICINES = "";
			newRow.ACTIO_TELEMEDICINA = "";
			newRow.ACTIO_CUIDADO = "";
			//BAC - FIM			

			newRow.DENTAL_PLAN = "";
			newRow.DRUGSTORE = "";
			newRow.TELEMEDICINA = "";
			newRow.CUIDADO = "";
			newRow.HEALTH_INSURANCE = "";
			newRow.ENDDA_DELIM = null;
			// this.fSetBenefitsValue(false, newRow);
			return newRow;
		},
		// --------------------------------------------
		// fSetBenefitsValue
		// --------------------------------------------		
		fSetBenefitsValue: function(clearFields, selectedRow) {
			var oPlansData = this.getView().getModel("ET_PLANS").getData();
			var oAction = this.getView().getModel("ET_ACTION");

			if (clearFields === true) {
				//Clear the Benefit fields
				selectedRow.HEALTH_INSURANCE = "";
				selectedRow.DENTAL_PLAN = "";
				selectedRow.DRUGSTORE = "";
				selectedRow.TELEMEDICINA = "";
				selectedRow.CUIDADO = "";
				this.getView().byId("ipDentalInsurance").setValue("");
				this.getView().byId("ipHealthInsurance").setValue("");
				this.getView().byId("ipDrugstore").setValue("");
				this.getView().byId("ipTelemedicina").setValue("");
				this.getView().byId("ipCuidado").setValue("");

			} else {

				//Dental Plan
				if (oAction.getData().ACTION === "INS") {
					if (oPlansData.ACTIVE_DENTAL_PLAN === "X") {
						selectedRow.DENTAL_PLAN = oPlansData.BPLAN_BRDE;
						//BAC
						//selectedRow.ACTIO_DENTAL_PLAN = "INS";
						this.getView().byId("ipDentalInsurance").setValue(oPlansData.LTEXT_BRDE);
					} else {
						selectedRow.DENTAL_PLAN = "";
						//BAC
						//selectedRow.ACTIO_DENTAL_PLAN = "";
						this.getView().byId("ipDentalInsurance").setValue("");
					}

					//Health Insurance
					if (oPlansData.ACTIVE_HEALTH_INSURANCE === "X") {
						selectedRow.HEALTH_INSURANCE = oPlansData.BPLAN_BRHE;
						this.getView().byId("ipHealthInsurance").setValue(oPlansData.LTEXT_BRHE);
					} else {
						selectedRow.HEALTH_INSURANCE = "";
						//BAC
						//selectedRow.ACTIO_HEALTH_INSURANCE = "";
						this.getView().byId("ipHealthInsurance").setValue("");
					}

				} else {

					//Dental Plan
					if (selectedRow.DENTAL_PLAN.trim() !== "") {
						selectedRow.DENTAL_PLAN = oPlansData.BPLAN_BRDE;
						this.getView().byId("ipDentalInsurance").setValue(oPlansData.LTEXT_BRDE);
					} else {
						selectedRow.DENTAL_PLAN = "";
						//BAC
						//selectedRow.ACTIO_DENTAL_PLAN = "";
						this.getView().byId("ipDentalInsurance").setValue("");
					}

					//Health Insurance
					if (selectedRow.HEALTH_INSURANCE.trim() !== "") {
						selectedRow.HEALTH_INSURANCE = oPlansData.BPLAN_BRHE;
						this.getView().byId("ipHealthInsurance").setValue(oPlansData.LTEXT_BRHE);
					} else {

						if (this.fVerifyObligatoryBenefit() !== true) {
							selectedRow.HEALTH_INSURANCE = "";
							//BAC
							//selectedRow.ACTIO_HEALTH_INSURANCE = "";
							this.getView().byId("ipHealthInsurance").setValue("");

						} else {

							if (oPlansData.ACTIVE_HEALTH_INSURANCE === "X") {
								selectedRow.HEALTH_INSURANCE = oPlansData.BPLAN_BRHE;
								//BAC
								//selectedRow.ACTIO_HEALTH_INSURANCE = "INS";
								this.getView().byId("ipHealthInsurance").setValue(oPlansData.LTEXT_BRHE);

							} else {
								selectedRow.HEALTH_INSURANCE = "";
								//BAC
								//selectedRow.ACTIO_HEALTH_INSURANCE = "";
								this.getView().byId("ipHealthInsurance").setValue("");
							}
						}
					}
				}

				//Drugstore
				if (oPlansData.ACTIVE_MEDICINES === "X") {

					if (selectedRow.DRUGSTORE.trim() === "") {
						selectedRow.DRUGSTORE = oPlansData.BPLAN_BRDG;
					}

					this.getView().byId("ipDrugstore").setValue(oPlansData.LTEXT_BRDG);

				} else {
					selectedRow.DRUGSTORE = "";
					this.getView().byId("ipDrugstore").setValue("");
				}

				//Telemedicina
				if (oPlansData.ACTIVE_TELEMEDICINA === "X") {

					if (selectedRow.TELEMEDICINA.trim() === "") {
						selectedRow.TELEMEDICINA = oPlansData.BPLAN_BRTM;
					}

					this.getView().byId("ipTelemedicina").setValue(oPlansData.LTEXT_BRTM);

				} else {
					selectedRow.TELEMEDICINA = "";
					this.getView().byId("ipTelemedicina").setValue("");
				}

				//+Cuidados
				if (oPlansData.ACTIVE_CUIDADO === "X") {

					if (selectedRow.CUIDADO.trim() === "") {
						selectedRow.CUIDADO = oPlansData.BPLAN_BRAS;
					}

					this.getView().byId("ipCuidado").setValue(oPlansData.LTEXT_BRAS);

				} else {
					selectedRow.CUIDADO = "";
					this.getView().byId("ipCuidado").setValue("");
				}

			}
		},
		// --------------------------------------------
		// onHealthInsurance
		// --------------------------------------------		
		onHealthInsurance: function(oEvent) {
			var selectedRow;
			//var originalRow;
			//var action;
			var oView = this.getView();
			var oButtonName = oEvent.getParameter("id").substring(12);
			var oModelPlan = oView.getModel("ET_PLANS");
			var oAction = oView.getModel("ET_ACTION");

			//Gets the user's selected row
			if (oAction.oData.ACTION === "INS") {
				selectedRow = this.getView().getModel("ET_NEW_ROW").getData();
			} else {
				selectedRow = this.fGetSelectedRowDetail();
			}

			//Gets the original row of the user's selection
			//originalRow = this.fGetOriginalRowModel(selectedRow);
			switch (oButtonName) {
				case "btnCancelHealthInsurance":

					var that = this;
					MessageBox.confirm(
						"Confirma exclusão do plano de saúde ?", {
							title: "Exclusão",
							initialFocus: sap.m.MessageBox.Action.CANCEL,
							onClose: function(sButton) {
								if (sButton === MessageBox.Action.OK) {

									//Removes the benefit from the dependent
									selectedRow.HEALTH_INSURANCE = "";
									oView.byId("ipHealthInsurance").setValue("");
									oView.byId("btnCancelHealthInsurance").setVisible(false);
									//Sets the Input Button only if there is a plan available and if it's active
									if (oModelPlan.BPLAN_BRHE !== "") {
										oView.byId("btnAddHealthInsurance").setVisible(true);
									} else {
										oView.byId("btnAddHealthInsurance").setVisible(false);
									}
									//Action executed by the user
									//action = "DEL";
									that.fMessageExcludeHealthInsurance();

									return true;
								}
							}
						});
					break;
				case "btnAddHealthInsurance":
					//Sets to screen the benefit value allowed to the dependent
					selectedRow.HEALTH_INSURANCE = oModelPlan.oData.BPLAN_BRHE;
					oView.byId("btnCancelHealthInsurance").setVisible(true);
					oView.byId("btnAddHealthInsurance").setVisible(false);
					//Sets plan's value
					oView.byId("ipHealthInsurance").setValue(oModelPlan.oData.LTEXT_BRHE);
					//Action executed by the user
					//action = "INS";
					break;
			}

			//BAC
			/*			//Sets the action only if the original and current value are different from each other
						if (originalRow === undefined) {
							//New record is always diferent from original
							if (oAction.oData.ACTION === "INS") {
								selectedRow.ACTIO_HEALTH_INSURANCE = "";
							} else {
								selectedRow.ACTIO_HEALTH_INSURANCE = action;
							}

						} else {
							//Modifying dependent
							if (selectedRow.HEALTH_INSURANCE !== originalRow.HEALTH_INSURANCE) {
								selectedRow.ACTIO_HEALTH_INSURANCE = action;
							} else {
								selectedRow.ACTIO_HEALTH_INSURANCE = "";
							}
						}*/
		},
		// --------------------------------------------
		// onDentalInsurance
		// --------------------------------------------		
		onDentalInsurance: function(oEvent) {
			var selectedRow;
			//var originalRow;
			//var action;
			var oView = this.getView();
			var oButtonName = oEvent.getParameter("id").substring(12);
			var oModelPlan = oView.getModel("ET_PLANS").getData();
			var oAction = oView.getModel("ET_ACTION");

			//Gets the user's selected row
			if (oAction.oData.ACTION === "INS") {
				selectedRow = this.getView().getModel("ET_NEW_ROW").getData();
			} else {
				selectedRow = this.fGetSelectedRowDetail();
			}
			//Gets the original row of the user's selection
			//	originalRow = this.fGetOriginalRowModel(selectedRow);
			switch (oButtonName) {
				case "btnCancelDentalInsurance":

					var that = this;
					MessageBox.confirm(
						"Confirma exclusão do plano odontológico ?", {
							title: "Exclusão",
							initialFocus: sap.m.MessageBox.Action.CANCEL,
							onClose: function(sButton) {

								if (sButton === MessageBox.Action.OK) {

									//Removes the benefit from the dependent
									oView.byId("ipDentalInsurance").setValue("");
									oView.byId("btnCancelDentalInsurance").setVisible(false);

									//Sets the Input Button only if there is a plan available and if it's active
									if (oModelPlan.BPLAN_BRDE !== "") {
										oView.byId("btnAddDentalInsurance").setVisible(true);
									} else {
										oView.byId("btnAddDentalInsurance").setVisible(false);
									}

									//Action executed by the user
									//action = "DEL";
									selectedRow.DENTAL_PLAN = "";
									that.fMessageExcludeDentalInsurance(oAction.oData.ACTION, selectedRow);

									return true;
								}
							}
						});

					break;
				case "btnAddDentalInsurance":
					//Sets to screen the benefit value allowed to the dependent
					selectedRow.DENTAL_PLAN = oModelPlan.BPLAN_BRDE;
					oView.byId("btnCancelDentalInsurance").setVisible(true);
					oView.byId("btnAddDentalInsurance").setVisible(false);
					//Sets plan's value
					oView.byId("ipDentalInsurance").setValue(oModelPlan.LTEXT_BRDE);
					//Action executed by the user
					//action = "INS";
					break;
			}
			//Sets the action only if the original and current value are different from each other
			//BAC
			/*			if (originalRow === undefined) {
							if (oAction.oData.ACTION === "INS") {
								selectedRow.ACTIO_DENTAL_PLAN = "";
							} else {
								//New record is always diferent from original
								selectedRow.ACTIO_DENTAL_PLAN = action;
							}
						} else {
							//Modifying dependent
							if (selectedRow.DENTAL_PLAN !== originalRow.DENTAL_PLAN) {
								selectedRow.ACTIO_DENTAL_PLAN = action;
							} else {
								selectedRow.ACTIO_DENTAL_PLAN = "";
							}
						}*/
		},
		// --------------------------------------------
		// fGetOriginalRowModel
		// --------------------------------------------			
		fGetOriginalRowModel: function(actualRowModel) {
			var oView = this.getView();
			var oModelDep = oView.getModel("ET_DEPENDENTS");
			//Gets the original model from the key SUBTY + OBJPS combination given in compair of the user's selected table row 
			for (var i = 0; i < oModelDep.oData.length; i++) {
				if (actualRowModel.SUBTY === oModelDep.oData[i].SUBTY && actualRowModel.OBJPS === oModelDep.oData[i].OBJPS) {
					return oModelDep.oData[i];
				}
			}
		},
		//	--------------------------------------------
		//	fMessageExcludeHealthInsurance
		//	--------------------------------------------		
		fMessageExcludeHealthInsurance: function() {
			var member = this.getView().byId("slMemberType").getSelectedKey();

			if (member === "1" || member === "2" || member === "6") {
				var message = "Para realizar a exclusão do plano de saúde de seu ";

				if (member === "1") {
					message = message + "(sua) cônjuge";
				} else {
					message = message + "filho(a)/ enteado(a)";
				}

				message = message + ", anexe comprovante do cadastro do outro plano assim como o Termo de exclusão\n\n";

				message = message + "Estou ciente que: \n";
				message = message +
					"Poderei solicitar o retorno ao plano, porém, deverei cumprir todas as regras de carência determinadas pela operadora \n\n";
				message = message +
					"O descarte de minhas carteirinhas deverá ocorrer junto ao RH Local. \n\n";
				message = message +
					"Para realizar a exclusão do seu plano de saúde, anexe o comprovante do cadastro do outro plano assim como o Termo de exclusão. ";

				MessageBox.warning(message);
			}
		},
		//	--------------------------------------------
		//	fMessageExcludeDentalInsurance
		//	--------------------------------------------		
		fMessageExcludeDentalInsurance: function(action, selectedRow) {
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var message;
			var originalRow = this.fGetOriginalRowModel(selectedRow);

			if (action !== "INS" && originalRow !== undefined) {

				if (originalRow.DENTAL_PLAN.trim() !== "" && originalRow.DENTAL_PLAN !== undefined) {

					message = "Lembramos que no caso de exclusão do plano odontológico antes do prazo previsto ";
					if (memberType === "1") {
						message = message + "e sem alteração do estado civil, ";
					}
					message = message + "acarretará em multa, conforme contratado estipulado pelo seu plano: \n\n";
					message = message +
						"INPAO: Em caso de desistência antes do prazo, será devido a cobrança do pagamento de multa equivalente ao valor de 6 mensalidades. \n\n";
					message = message +
						"UNIODONTO: Em caso de desistência antes do prazo, será devido a cobrança do pagamento de multa equivalente a 50% das mensalidades restantes. \n\n";
					message = message +
						"MetLife: Em caso de desistência antes do prazo, será devido a cobrança do pagamento de multa equivalente ao valor de 6 mensalidades”. ";
					MessageBox.warning(message);
				}
			}
		},
		//	--------------------------------------------
		//	fFooterButtonsAttribute
		//	--------------------------------------------		
		fFooterButtonsAttribute: function(attribute, noData) {
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");
			var oView = this.getView();

			if (oGlobalInformation.EX_IS_APPROVER === "X") {
				oView.byId("btnSave").setVisible(false);
				oView.byId("btnAccept").setVisible(false);

				oView.byId("btnApprove").setVisible(attribute);
				oView.byId("btnCancel").setVisible(attribute);
				// oView.byId("btnReject").setVisible(attribute);
			} else {

				if (noData === "X") {
					oView.byId("btnSave").setVisible(true);
					oView.byId("btnAccept").setVisible(true);
					oView.byId("btnSave").setEnabled(false);
					oView.byId("btnAccept").setEnabled(false);
					oView.byId("btnSaveAction").setVisible(false);
					oView.byId("btnCancelAction").setVisible(false);
					oView.byId("btnModDep").setEnabled(false);
					oView.byId("btnDelimitDep").setEnabled(false);

				} else {
					oView.byId("btnSave").setVisible(attribute);
					oView.byId("btnAccept").setVisible(attribute);
					oView.byId("btnSave").setEnabled(attribute);
					oView.byId("btnAccept").setEnabled(attribute);

					if (attribute === true) {
						oView.byId("btnSaveAction").setVisible(false);
						oView.byId("btnCancelAction").setVisible(false);
					} else {
						oView.byId("btnSaveAction").setVisible(true);
						oView.byId("btnCancelAction").setVisible(true);
					}
				}
			}
		},

		//	--------------------------------------------
		//	onDelimitDateChange
		//	--------------------------------------------
		onDelimitDateChange: function(oEvent) {
			var fieldname = oEvent.getParameter("id").substring(12);
			if (oEvent.getParameter("valid") === true) {
				this.fMessage("None", null, fieldname);
			} else {
				this.fMessage("Error", "entrada_invalida", fieldname);
			}
		},
		//	--------------------------------------------
		//	onBirthDateChange
		//	--------------------------------------------	

		onBirthDateChange: function(oEvent) {
			if (oEvent.getParameter("valid") === true) {
				this.fMessage("None", null, "dpDependentBirthDate");
				this.fCPFValidation();
				this.fStudentValidation();

				// if (this.fMemberTypeValidation() === true) {
				// 	this.fBenefits(true);
				// } else {
				// 	this.fBenefits(false);
				// }

				this.fVerifyBornAliveMandatory();

			} else {
				this.fMessage("Error", "entrada_invalida", "dpDependentBirthDate");
			}
		},
		onSelectImposto: function() {
			var required;

			if (this.getView().byId("cbDependentIncomeTax").getSelected() === true) {
				required = true;
				this.changedData.push("cbDependentIncomeTax"); //TGE388990
			} else {
				required = false;
			}

			this.getView().byId("ipDependentCpf").setRequired(required);
			this.getView().byId("lblCpf").setRequired(required);
		},
		//	--------------------------------------------
		//	fCPFValidation
		//	--------------------------------------------		
		fCPFValidation: function() {
			var birthDate = this.getView().byId("dpDependentBirthDate").getValue();
			var oPlansModel = this.getView().getModel("ET_PLANS");
			var memberType = this.getView().byId("slMemberType").getSelectedKey();
			var required;

			if (memberType === "11" || memberType === "12") {
				if (this.getView().byId("cbDependentIncomeTax").getSelected() === true) {
					required = true;
				} else {
					required = false;
				}

			} else {

				required = true;

			}

			this.fMessage("None", null, "ipDependentCpf");

			/*			if (required === true) { - CR - somente no enviar - 16.05
							this.fValidationObligatoryFields("ipDependentCpf");
						}*/

			this.getView().byId("ipDependentCpf").setRequired(required);
			this.getView().byId("lblCpf").setRequired(required);

		},
		//	--------------------------------------------
		//	fStudentValidation
		//	--------------------------------------------			
		fStudentValidation: function() {
			//CR - dia 24.05 - Todos os checkbox sempre aberto
			/*			var oPlansModel = this.getView().getModel("ET_PLANS");
						var birthDate = this.getView().byId("dpDependentBirthDate").getValue();
						var oMemberType = this.getView().byId("slMemberType").getSelectedKey();

						//Student Checkbox - Son or Stepson
						if (oMemberType === "2" || oMemberType === "6") {
							if (birthDate >= oPlansModel.oData.ESTUD_BEGDA & birthDate <= oPlansModel.oData.ESTUD_ENDDA) {
								this.getView().byId("cbStudentDependent").setEnabled(true);
							} else {
								this.getView().byId("cbStudentDependent").setSelected(false);
								this.getView().byId("cbStudentDependent").setEnabled(false);
							}
						} else {
							this.getView().byId("cbStudentDependent").setEnabled(false);
						}*/
		},

		//	--------------------------------------------
		//	onDependentRowSelectionChange
		//	--------------------------------------------		
		onDependentRowSelectionChange: function() {
			var oView = this.getView();
			var selectedRow;
			var closedReqModel = this.getView().getModel("ET_CLOSED_REQUISITION");

			if (closedReqModel !== undefined && closedReqModel.oData.CLOSED === "X") {
				if (this.fGetSelectedRow() === true) {
					selectedRow = this.fGetSelectedRowDetail();
					this.fFillDependentDetail(selectedRow);
					this.fSetDependentsFieldsAttribute(true, false, false, selectedRow.STATUS);

					this.fRequiredFields();
					this.fCPFValidation();
					this.fStudentValidation();
					this.fVerifyBornAliveMandatory();
					this.fSetLog();

				} else {
					this.fSetDependentsFieldsAttribute(false);
				}
				return;
			}

			if (this.fGetSelectedRow() === true) {
				//Gets the complete data of the selected row
				selectedRow = this.fGetSelectedRowDetail();

				//Only records that are on ECC can be delimited
				if (selectedRow.STATUS === "Excluído") {
					oView.byId("btnDelimitDep").setEnabled(true);
				} else {
					oView.byId("btnDelimitDep").setEnabled(false);
				}

				//Sets attributes of the table header buttons.
				//Include: After a new record, it's only allowed the modify button
				//Exclude: After delimiting the record, it's only allowed the delimitation button
				//Modify: After changing the record, it's only allowed the modify button
				//When no line is selected, only the include new record button is allowed
				switch (selectedRow.STATUS) {
					case "Excluído":
						oView.byId("btnDelimitDep").setEnabled(true);
						oView.byId("btnAddDep").setEnabled(false);
						oView.byId("btnModDep").setEnabled(false);
						break;
					case "Novo":
						oView.byId("btnDelimitDep").setEnabled(false);
						oView.byId("btnAddDep").setEnabled(false);
						oView.byId("btnModDep").setEnabled(true);
						break;
					case "Modificado":
						oView.byId("btnDelimitDep").setEnabled(false);
						oView.byId("btnAddDep").setEnabled(false);
						oView.byId("btnModDep").setEnabled(true);
						break;
					default:

						if (selectedRow.SUBTY === "11" || selectedRow.SUBTY === "12") {
							oView.byId("btnDelimitDep").setEnabled(false);
						} else {
							oView.byId("btnDelimitDep").setEnabled(true);
						}

						oView.byId("btnAddDep").setEnabled(false);
						oView.byId("btnModDep").setEnabled(true);
						break;
				}

				this.fFillDependentDetail();

				//Sets dependent form visible, with no delimitation date and form NOT editable
				this.fSetDependentsFieldsAttribute(true, false, false, selectedRow.STATUS);

				if (this.fGetSelectedRow() === true) {
					this.fSetNRegStatus(selectedRow.SUBTY);
				} else {
					this.fSetNRegStatus("");
				}

			} else {
				oView.byId("btnModDep").setEnabled(false);
				oView.byId("btnDelimitDep").setEnabled(false);
				oView.byId("btnAddDep").setEnabled(true);

				//Hides the form
				this.fSetDependentsFieldsAttribute(false);
			}

			//Hides all kind of action buttons that manipulates the data
			this.fActionButtonsDataAttribute(false);

			//If it is an approval step, shows modified fields
			this.fRequiredFields();
			this.fCPFValidation();
			this.fStudentValidation();
			this.validateRegionBirthCountry(); //TGE388990
			this.fVerifyBornAliveMandatory();
			this.fSetLog();
			
		},
		
	
		fSetNRegStatus: function(subty) {

			var status;

			if (subty === "2" || subty === "6" ||
				subty === "9" || subty === "14") {
				status = true;
			} else {
				status = false;
			}

			this.getView().byId("ipMatricula").setVisible(status);
			this.getView().byId("ipNRegistro").setVisible(status);
			this.getView().byId("ipNLivro").setVisible(status);
			this.getView().byId("ipNFolha").setVisible(status);
		},
		//	--------------------------------------------
		//	fSetLog
		//	--------------------------------------------		
		fSetLog: function() {
			var oLog = this.getView().getModel("ET_LOG_DEP");
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");

			//Resets the CSS to all fields, aiming to avoid trash from others registries
			this.fResetFieldsColor();

			if (oLog !== undefined && this.fGetSelectedRow() === true && oGlobalInformation.IM_REQUISITION_ID !== "" && oGlobalInformation.IM_REQUISITION_ID !==
				"00000000" && oGlobalInformation.IM_REQUISITION_ID !== undefined) {

				var selectedRow = this.fGetSelectedRowDetail();

				if (selectedRow !== undefined) {
					//Highlight the modified fields of this specific entry
					for (var i = 0; i < oLog.getData().length; i++) {
						//Highlight all fields
						if (selectedRow.ACTIO_BLOCK === "INS" && selectedRow.STATUS === "Novo") {
							this.fHighlightFieldsColor();
							continue;
						}

						if (oLog.oData[i].FIELD.substring(0, 5) === "ACTIO" || oLog.oData[i].FIELD === "FAVOR") {
							continue;
						}

						if (oLog.oData[i].SUBTY === selectedRow.SUBTY && oLog.oData[i].OBJPS === selectedRow.OBJPS) {
							this.fSetFieldCssStyle(oLog.oData[i].FIELD, "highlight");
						}
					}
				}
			}
		},

		//	--------------------------------------------
		//	fSetFieldCssStyle
		//	--------------------------------------------		
		fSetFieldCssStyle: function(fieldName, classIns) {
			var oPropText = this.getView().byId(fieldName);
			var noUpdate = false;

			if (oPropText) {
				var aStyle = oPropText.aCustomStyleClasses;
				var classDel;

				//If it's inserting highlight, we need to remove "default" property and vice versa
				switch (classIns) {
					case "default":
						classDel = "highlight";
						break;
					case "highlight":
						classDel = "default";
						break;
				}

				for (var i = 0; i < aStyle.length; i++) {
					if (aStyle[i] === classDel) {
						aStyle.splice(i, 1);
						oPropText.rerender();

					} else if (aStyle[i] === classIns) {
						noUpdate = true;
						break;
					}
				}

				//If the "Insert Class" has already been set to the field, don't update it, because if we do, 
				//we would have two equals style in the same field 
				if (noUpdate === false) {
					aStyle[i - 1] = classIns;
					oPropText.rerender();
				}

			}
		},

		//	--------------------------------------------
		//	fResetFieldsColor
		//	--------------------------------------------		
		fResetFieldsColor: function() {
			//Dependent's data
			this.fSetFieldCssStyle("lblMemberType", "default");
			this.fSetFieldCssStyle("lblDependentFullName", "default");
			this.fSetFieldCssStyle("lblSex", "default");
			this.fSetFieldCssStyle("lblDependentBirthDate", "default");
			this.fSetFieldCssStyle("lblDependentBirthCountry", "default");
			this.fSetFieldCssStyle("lblDependentNationality", "default");
			this.fSetFieldCssStyle("lblDependentRegion", "default");
			this.fSetFieldCssStyle("lblDependentBirthPlace", "default");
			this.fSetFieldCssStyle("lblMatricula", "default");
			this.fSetFieldCssStyle("lblNRegistro", "default");
			this.fSetFieldCssStyle("lblNLivro", "default");
			this.fSetFieldCssStyle("lblNFolha", "default");
			this.fSetFieldCssStyle("lblCpf", "default");
			this.fSetFieldCssStyle("lblDependentBornAliveNumber", "default");
			this.fSetFieldCssStyle("lblDependentsMothersName", "default");

			//Elegibilities (checkbox)
			this.fSetFieldCssStyle("lblInvalidDependent", "default");
			this.fSetFieldCssStyle("lblStudentDependent", "default");
			this.fSetFieldCssStyle("lblDependentFamilySalary", "default");
			this.fSetFieldCssStyle("lblDependentIncomeTax", "default");

			//Benefits
			// this.fSetFieldCssStyle("lblDrugstore", "default");
			// this.fSetFieldCssStyle("lblHealthInsurance", "default");
			// this.fSetFieldCssStyle("lblDentalInsurance", "default");
			// this.fSetFieldCssStyle("lblTelemedicina", "default");
			// this.fSetFieldCssStyle("lblCuidado", "default");

		},

		//	--------------------------------------------
		//	fHighlightFieldsColor
		//	--------------------------------------------		
		fHighlightFieldsColor: function() {
			//Dependent's data
			this.fSetFieldCssStyle("lblMemberType", "highlight");
			this.fSetFieldCssStyle("lblDependentFullName", "highlight");
			this.fSetFieldCssStyle("lblSex", "highlight");
			this.fSetFieldCssStyle("lblDependentBirthDate", "highlight");
			this.fSetFieldCssStyle("lblDependentBirthCountry", "highlight");
			this.fSetFieldCssStyle("lblDependentNationality", "highlight");
			this.fSetFieldCssStyle("lblDependentRegion", "highlight");
			this.fSetFieldCssStyle("lblDependentBirthPlace", "highlight");
			this.fSetFieldCssStyle("lblMatricula", "highlight");
			this.fSetFieldCssStyle("lblNRegistro", "highlight");
			this.fSetFieldCssStyle("lblNLivro", "highlight");
			this.fSetFieldCssStyle("lblNFolha", "highlight");
			this.fSetFieldCssStyle("lblCpf", "highlight");
			this.fSetFieldCssStyle("lblDependentBornAliveNumber", "highlight");
			this.fSetFieldCssStyle("lblDependentsMothersName", "highlight");

			//Elegibilities (checkbox)
			this.fSetFieldCssStyle("lblInvalidDependent", "highlight");
			this.fSetFieldCssStyle("lblStudentDependent", "highlight");
			this.fSetFieldCssStyle("lblDependentFamilySalary", "highlight");
			this.fSetFieldCssStyle("lblDependentIncomeTax", "highlight");

			//Benefits
			// this.fSetFieldCssStyle("lblDrugstore", "highlight");
			// this.fSetFieldCssStyle("lblHealthInsurance", "highlight");
			// this.fSetFieldCssStyle("lblDentalInsurance", "highlight");
			// this.fSetFieldCssStyle("lblTelemedicina", "highlight");
			// this.fSetFieldCssStyle("lblCuidado", "highlight");
		},

		//--------------------------------------------
		//	fGetSelectedRowDetail
		//--------------------------------------------		
		fGetSelectedRowDetail: function() {
			var oTable = this.getView().byId("tDependents");
			var selectedIndex = oTable.getSelectedIndex();
			var oTableModel = this.getView().byId("tDependents").getModel();
			var completeRows = oTableModel.getData();
			return completeRows[selectedIndex];
		},

		//--------------------------------------------
		//	fVerifyObligatoryFieldsGlobal
		//--------------------------------------------			
		fVerifyObligatoryFieldsGlobal: function(action) {
			var oPlansModel = this.getView().getModel("ET_PLANS");
			var oTableModel = this.getView().byId("tDependents").getModel();
			var messageMember;
			var space = " ";
			var aMessage = [];
			var errorDateOfBirth;
			var stringMessage;
			var completeMessage;
			var actionText = "";
			var messageHeader = "";

			switch (action) {
				case "X":
					actionText = "saneamento";
					break;

				case "S":
					actionText = "envio";
					break;
			}

			messageHeader = "Há campo(s) com inconsistência(s). Favor realizar os ajustes necessários para o" + space + actionText + space +
				"de dados: \n\n";

			if (oTableModel.oData.length > 0) {
				oTableModel = oTableModel.getData();
				errorDateOfBirth = false;

				for (var i = 0; i < oTableModel.length; i++) {
					if (oTableModel[i].ACTIO_BLOCK === "DEL") {
						continue;
					}

					messageMember = "● " + oTableModel[i].MEMBER + space;

					//Full Name
					if (oTableModel[i].FCNAM.trim() === "") {
						messageMember = messageMember + "(linha" + space + i + "):";
						aMessage[aMessage.length] = messageMember + space + "Nome Completo obrigatório";
					} else {
						messageMember = messageMember + oTableModel[i].FCNAM + ":" + space;
					}

					//Date of Birth
					if (oTableModel[i].FGBDT === null || oTableModel[i].FGBDT === undefined || oTableModel[i].FGBDT === "") {
						aMessage[aMessage.length] = messageMember + "Data Nasc. obrigatório";
						errorDateOfBirth = true;
					}

					//Duplicated CPF
					if (this.fValidateDuplicatedCpf(oTableModel[i].ICNUM, i) === true) {
						aMessage[aMessage.length] = messageMember + "CPF já existente";
					}

					//Father and Mother only consider full name and date of birth as obligatory - 
					//If IR is marked, CPF is obligatory as well
					if (oTableModel[i].SUBTY !== "11" && oTableModel[i].SUBTY !== "12") {

						if (oTableModel[i].FGBLD.trim() === "") {
							aMessage[aMessage.length] = messageMember + "País Nascimento obrigatório";
						}

						if (oTableModel[i].FANAT.trim() === "") {
							aMessage[aMessage.length] = messageMember + "Nacionalidade obrigatório";
						}

						if(this.getView().byId("ipDependentRegion").getEnabled()){
							if (oTableModel[i].UFBOT.trim() === "") {
								aMessage[aMessage.length] = messageMember + "Estado obrigatório";
							}
						}

						if(this.getView().byId("ipDependentBirthPlace").getEnabled()){
							if (oTableModel[i].FGBOT.trim() === "") {
								aMessage[aMessage.length] = messageMember + "Local Nascimento obrigatório";
							}
						}	

						if (oTableModel[i].MOTHE.trim() === "") {
							aMessage[aMessage.length] = messageMember + "Nome da Mãe do Dependente obrigatório";
						}

						if (oTableModel[i].ICNUM.trim() === "") {
							aMessage[aMessage.length] = messageMember + "CPF obrigatório";
						}

						//Validate CPF and Born Alive Number only if Date of Birth is filled
						if (errorDateOfBirth === false) {
							// if (oTableModel[i].FGBDT < oPlansModel.oData.CPF_DATE && oTableModel[i].ICNUM.trim() === "") {
							// 	aMessage[aMessage.length] = messageMember + "CPF obrigatório";
							// }

							if (oTableModel[i].FGBDT.substring(0, 4) >= "2010" && oTableModel[i].LBCNR.trim() === "" &&
								oTableModel[i].SUBTY !== "11" && oTableModel[i].SUBTY !== "12" && oTableModel[i].FGBLD === "BR") {
								aMessage[aMessage.length] = messageMember + "Nº Cert. Nasc. Vivo obrigatório";
							}

						}
					} else {

						if (oTableModel[i].IRFLG === "X" && oTableModel[i].ICNUM.trim() === "") {
							aMessage[aMessage.length] = messageMember + "CPF obrigatório";
						}

					}
				}

				//Concatenate message into one to display it to user	
				for (var j = 0; j < aMessage.length; j++) {
					if (j === 0) {
						stringMessage = aMessage[j];
					} else {
						stringMessage = stringMessage + '\n' + aMessage[j];
					}
				}

				if (stringMessage !== undefined) {
					completeMessage = messageHeader + stringMessage;

					//Popup with the errors details
					MessageBox.error(completeMessage);
					return true;
				}
			}
		},

		//--------------------------------------------
		//	fFillDependentDetail
		//--------------------------------------------		
		fFillDependentDetail: function(rowDetail) {
			var oView = this.getView();
			var oPlansModel = this.getView().getModel("ET_PLANS").getData();
			var completeSelectedRow;

			if (rowDetail === undefined || rowDetail === null) {
				completeSelectedRow = this.fGetSelectedRowDetail();
				oView.byId("txtDependentBirthCountry").setText("");
				oView.byId("txtDependentNationality").setText("");
				oView.byId("txtDependentRegion").setText("");
			} else {
				completeSelectedRow = rowDetail;
			}
			if (completeSelectedRow !== undefined) {
				oView.byId("dpDependentBirthDate").setValue(completeSelectedRow.FGBDT);
				oView.byId("slMemberType").setSelectedKey(completeSelectedRow.SUBTY);
				oView.byId("ipDependentFullName").setValue(completeSelectedRow.FCNAM);
				oView.byId("ipDependentBirthCountry").setValue(completeSelectedRow.FGBLD);
				oView.byId("ipDependentNationality").setValue(completeSelectedRow.FANAT);
				oView.byId("ipDependentRegion").setValue(completeSelectedRow.UFBOT);
				oView.byId("ipDependentBirthPlace").setValue(completeSelectedRow.FGBOT);
				oView.byId("ipMatricula").setValue(completeSelectedRow.NOREU);
				oView.byId("ipNRegistro").setValue(completeSelectedRow.NOREG);
				oView.byId("ipNLivro").setValue(completeSelectedRow.NOLIV);
				oView.byId("ipNFolha").setValue(completeSelectedRow.NOFOL);
				oView.byId("ipDependentCpf").setValue(completeSelectedRow.ICNUM);
				oView.byId("ipDependentBornAliveNumber").setValue(completeSelectedRow.LBCNR);
				oView.byId("ipDependentsMothersName").setValue(completeSelectedRow.MOTHE);

				if (completeSelectedRow.FASEX === "1") {
					oView.byId("rbMale").setSelected(true);
				} else {
					oView.byId("rbFemale").setSelected(true);
				}

				if (completeSelectedRow.STINV === "X") {
					oView.byId("cbInvalidDependent").setSelected(true);
				} else {
					oView.byId("cbInvalidDependent").setSelected(false);
				}

				if (completeSelectedRow.ESTUD === "X") {
					oView.byId("cbStudentDependent").setSelected(true);
				} else {
					oView.byId("cbStudentDependent").setSelected(false);
				}

				if (completeSelectedRow.SALFA === "X") {
					oView.byId("cbDependentFamilySalary").setSelected(true);
				} else {
					oView.byId("cbDependentFamilySalary").setSelected(false);
				}

				if (completeSelectedRow.IRFLG === "X") {
					oView.byId("cbDependentIncomeTax").setSelected(true);
				} else {
					oView.byId("cbDependentIncomeTax").setSelected(false);
				}

				// // if (this.fMemberTypeValidation() === true) {
				// if (oPlansModel.ACTIVE_DENTAL_PLAN === "X" && completeSelectedRow.DENTAL_PLAN.trim() !== "") {
				// 	oView.byId("ipDentalInsurance").setValue(this.fFillBenefitsDesc("BRDE", completeSelectedRow.DENTAL_PLAN));
				// } else {
				// 	oView.byId("ipDentalInsurance").setValue("");
				// }

				// if (oPlansModel.ACTIVE_HEALTH_INSURANCE === "X" && completeSelectedRow.HEALTH_INSURANCE.trim() !== "") {
				// 	oView.byId("ipHealthInsurance").setValue(this.fFillBenefitsDesc("BRHE", completeSelectedRow.HEALTH_INSURANCE));
				// } else {
				// 	oView.byId("ipHealthInsurance").setValue("");
				// }

				// if (oPlansModel.ACTIVE_MEDICINES === "X" && oPlansModel.APPRENTICE !== "X" && completeSelectedRow.DRUGSTORE.trim() !== "") {
				// 	oView.byId("ipDrugstore").setValue(this.fFillBenefitsDesc("BRDG", completeSelectedRow.DRUGSTORE));
				// } else {
				// 	oView.byId("ipDrugstore").setValue("");
				// }

				// if (oPlansModel.ACTIVE_TELEMEDICINA === "X" && completeSelectedRow.TELEMEDICINA.trim() !== "") {
				// 	oView.byId("ipTelemedicina").setValue(this.fFillBenefitsDesc("BRTM", completeSelectedRow.TELEMEDICINA));
				// } else {
				// 	oView.byId("ipTelemedicina").setValue("");
				// }

				// if (oPlansModel.ACTIVE_CUIDADO === "X" && completeSelectedRow.CUIDADO.trim() !== "") {
				// 	oView.byId("ipCuidado").setValue(this.fFillBenefitsDesc("BRAS", completeSelectedRow.CUIDADO));
				// } else {
				// 	oView.byId("ipCuidado").setValue("");
				// }

				// } else {
				// 	oView.byId("ipHealthInsurance").setValue("");
				// 	oView.byId("ipDentalInsurance").setValue("");
				// 	oView.byId("ipDrugstore").setValue("");
				// }
				oView.byId("txtDependentBirthCountry").setText("");
				oView.byId("txtDependentNationality").setText("");
				oView.byId("txtDependentRegion").setText("");
			}
		},
		//--------------------------------------------
		//	fUpdateRecord
		//--------------------------------------------			
		fUpdateRecord: function() {
			var oView = this.getView();
			var oTable = oView.byId("tDependents");
			var oModelTable = oTable.getModel();
			var oActionModel = oView.getModel("ET_ACTION");
			var selectedRow;

			if (oActionModel.oData.ACTION === "INS") {
				selectedRow = this.getView().getModel("ET_NEW_ROW").getData();
				selectedRow = this.fModifyRowModelFromView(selectedRow);
			} else {
				selectedRow = this.fGetSelectedRowDetail();
			}
			if (selectedRow.STATUS !== "Novo") {
				selectedRow.STATUS = this.fSetActionDesc(oActionModel.oData.ACTION);
			}

			//Shows the user a message if it needs to attach some file - CR (somente no Enviar)
			/*						if (this.fAttachmentMessages(selectedRow.STATUS, oActionModel.oData.ACTION) !== true) {
										return false;
									}*/

			this.fAttachmentMessages(selectedRow.STATUS, oActionModel.oData.ACTION);

			selectedRow.ACTIO_BLOCK = oActionModel.oData.ACTION;
			switch (oActionModel.oData.ACTION) {
				case "DEL":
					selectedRow.ENDDA_DELIM = null;
					break;
				case "INS":
					//insert a new line to table
					var length = oModelTable.oData.length;
					oModelTable.oData[length] = {};
					oModelTable.oData[length] = selectedRow;
					break;
				case "MOD":
					this.fModifyRowModelFromView(selectedRow);
					break;
			}
			oModelTable.refresh();
		},

		// --------------------------------------------
		// onPress
		// -------------------------------------------- 
		onPress: function(oEvent) {
			var buttonName = oEvent.getParameter("id").substring(12);

			if (buttonName === "btnQuickViewHelp") {
				this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpDependents", this);
			}else if(buttonName === "btDependentBirth" || buttonName === "btDependentRegion" ) { //TGE388990
				this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpRegion", this);
			}else{
				 this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpDependentsElegibilities", this);
			}
			

			this._Dialog.open();
		},

		// --------------------------------------------
		// onPressQuickView
		// -------------------------------------------- 
		onPressQuickView: function(oEvent) {
			var buttonName = oEvent.getParameter("id").substring(12);
			var oQuickViewModelText;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var header;
			var text;

			switch (buttonName) {
				case "btnQuickViewMember":
					header = oBundle.getText("membro");
					text = oBundle.getText("texto_explicativo_membro_dep");
					break;

				case "btnQuickViewFullName":
					header = oBundle.getText("nome_compl");
					text = oBundle.getText("texto_explicativo_nome_completo_dep");
					break;
			}

			oQuickViewModelText = new sap.ui.model.json.JSONModel({
				text: text,
				header: header
			});

			sap.ui.getCore().setModel(oQuickViewModelText, "ET_QUICK_VIEW_TEXT");

			this._Dialog = sap.ui.xmlfragment("autoServico.view.QuickView", this);
			this._Dialog.open();
		},

		// --------------------------------------------
		// onClose
		// -------------------------------------------- 
		onClose: function() {
			this._Dialog.close();
		},

		//--------------------------------------------
		//	fAttachmentMessages
		//--------------------------------------------			
		fAttachmentMessages: function(status, action) {
			var memberTypeSelected = this.getView().byId("slMemberType").getSelectedKey();
			var attachment = true;
			var message;

			//CR - somente no enviar - 16.05
			/*			if ((action === "INS" || action === "DEL") || (action === "MOD" && memberTypeSelected !== "11" && memberTypeSelected !== "12")) {
							attachment = this.fValidAttachment();
						}*/

			if (attachment === false) {
				this.handleErrorMessageAttachment();
			} else {

				if (action !== "DEL") {

					// if (this.getView().byId("ipDentalInsurance").getValue() !== "" &&
					// 	this.getView().byId("ipDentalInsurance").getValue() !== " " &&
					// 	this.getView().byId("ipDentalInsurance").getValue() !== undefined) {

					// 	if (action === "INS") {
					// 		message = "Necessário anexar formulário de inclusão no plano odontológico";
					// 	} else {
					// 		var selectedRow = this.fGetSelectedRowDetail();
					// 		var originalRow = this.fGetOriginalRowModel(selectedRow);

					// 		if (originalRow !== undefined && originalRow.DENTAL_PLAN.trim() === "") {
					// 			message = "Necessário anexar formulário de inclusão no plano odontológico";
					// 		}
					// 	}
					// }

					if ((memberTypeSelected === "1") && ((action === "INS") || (action === "MOD" && status === "Novo"))) {
						if (memberTypeSelected === "1") {
							if (message !== undefined) {
								message = message + "\n\n";
							} else {
								message = "";
							}
							message = message + "Não se esqueça de alterar seu estado civil em Dados Pessoais";
						}
					}

					if (message !== undefined && message.trim() !== "") {
						MessageBox.warning(message);
					}
				}
			}

			return attachment;
		},
		//--------------------------------------------
		//	fModifyRowModelFromView
		//--------------------------------------------			
		fModifyRowModelFromView: function(selectedRow) {
			var oView = this.getView();
			var member;
			selectedRow.FGBDT = oView.byId("dpDependentBirthDate").getValue();
			selectedRow.SUBTY = oView.byId("slMemberType").getSelectedKey();
			selectedRow.FCNAM = oView.byId("ipDependentFullName").getValue();
			selectedRow.FGBLD = oView.byId("ipDependentBirthCountry").getValue();
			selectedRow.FANAT = oView.byId("ipDependentNationality").getValue();
			selectedRow.UFBOT = oView.byId("ipDependentRegion").getValue();
			selectedRow.FGBOT = oView.byId("ipDependentBirthPlace").getValue();
			selectedRow.NOREU = oView.byId("ipMatricula").getValue();
			selectedRow.NOREG = oView.byId("ipNRegistro").getValue();
			selectedRow.NOLIV = oView.byId("ipNLivro").getValue();
			selectedRow.NOFOL = oView.byId("ipNFolha").getValue();
			selectedRow.ICNUM = oView.byId("ipDependentCpf").getValue();
			selectedRow.LBCNR = oView.byId("ipDependentBornAliveNumber").getValue();
			selectedRow.MOTHE = oView.byId("ipDependentsMothersName").getValue();
			member = oView.byId("slMemberType");
			selectedRow.MEMBER = member.getSelectedItem().getProperty("text");
			if (oView.byId("rbMale").getSelected() === true) {
				selectedRow.FASEX = "1";
			} else {
				selectedRow.FASEX = "2";
			}

			if (oView.byId("cbInvalidDependent").getSelected() === true) {
				selectedRow.STINV = "X";
			} else {
				selectedRow.STINV = "";
			}

			if (oView.byId("cbStudentDependent").getSelected() === true) {
				selectedRow.ESTUD = "X";
			} else {
				selectedRow.ESTUD = "";
			}

			if (oView.byId("cbDependentFamilySalary").getSelected() === true) {
				selectedRow.SALFA = "X";
			} else {
				selectedRow.SALFA = "";
			}

			if (oView.byId("cbDependentIncomeTax").getSelected() === true) {
				selectedRow.IRFLG = "X";
			} else {
				selectedRow.IRFLG = "";
			}

			return selectedRow;
		},
		//--------------------------------------------
		//	fSetActionDesc
		//--------------------------------------------			
		fSetActionDesc: function(action) {
			switch (action) {
				case "INS":
					return "Novo";
				case "MOD":
					return "Modificado";
				case "DEL":
					return "Excluído";
				default:
					return "";
			}
		},
		//--------------------------------------------
		//	fClearFieldsToNewRecord
		//--------------------------------------------			
		fClearFieldsToNewRecord: function() {
			var oView = this.getView();
			oView.byId("slMemberType").setEnabled(true);
			oView.byId("dpDependentBirthDate").setValue("");
			oView.byId("slMemberType").setSelectedKey("1");
			oView.byId("ipDependentFullName").setValue("");
			oView.byId("ipDependentBirthCountry").setValue("");
			oView.byId("ipDependentNationality").setValue("");
			oView.byId("ipDependentRegion").setValue("");
			oView.byId("ipDependentBirthPlace").setValue("");
			oView.byId("ipMatricula").setValue("");
			oView.byId("ipNRegistro").setValue("");
			oView.byId("ipNLivro").setValue("");
			oView.byId("ipNFolha").setValue("");
			oView.byId("ipDependentCpf").setValue("");
			oView.byId("ipDependentBornAliveNumber").setValue("");
			oView.byId("ipDependentsMothersName").setValue("");
			oView.byId("txtDependentBirthCountry").setText("");
			oView.byId("txtDependentNationality").setText("");
			oView.byId("txtDependentRegion").setText("");
			oView.byId("rbFemale").setSelected(true);
			oView.byId("rbMale").setSelected(false);
			oView.byId("cbInvalidDependent").setSelected(false);
			oView.byId("cbStudentDependent").setSelected(false);
			oView.byId("cbDependentFamilySalary").setSelected(false);
			oView.byId("cbDependentIncomeTax").setSelected(false);
		},
		//--------------------------------------------
		//	fResetModel
		//--------------------------------------------		
		fResetModel: function() {
			var oView = this.getView();
			var oModelTable = oView.byId("tDependents").getModel();
			var oPlansModel = oView.getModel("ET_PLANS");
			var oActionModel = oView.getModel("ET_ACTION");
			var selectedRow = this.fGetSelectedRowDetail();
			if (selectedRow.STATUS !== "Novo") {
				var originalRow = this.fGetOriginalRowModel(selectedRow);
			}
			oActionModel.oData.ACTION = "";
			if (originalRow !== undefined) {
				selectedRow.ACTIO_BLOCK = "";
				selectedRow.ENDDA_DELIM = originalRow.ENDDA_DELIM;
				selectedRow.FGBDT = originalRow.FGBDT;
				selectedRow.SUBTY = originalRow.SUBTY;
				selectedRow.FCNAM = originalRow.FCNAM;
				selectedRow.FGBLD = originalRow.FGBLD;
				selectedRow.FANAT = originalRow.FANAT;
				selectedRow.UFBOT = originalRow.UFBOT;
				selectedRow.FGBOT = originalRow.FGBOT;
				selectedRow.ICNUM = originalRow.ICNUM;
				selectedRow.LBCNR = originalRow.LBCNR;
				selectedRow.MOTHE = originalRow.MOTHE;
				selectedRow.FASEX = originalRow.FASEX;
				selectedRow.STINV = originalRow.STINV;
				selectedRow.ESTUD = originalRow.ESTUD;
				selectedRow.SALFA = originalRow.SALFA;
				selectedRow.IRFLG = originalRow.IRFLG;
				selectedRow.STATUS = "";
				selectedRow.ACTIO_HEALTH_INSURANCE = "";
				selectedRow.ACTIO_DENTAL_PLAN = "";
				selectedRow.ACTIO_MEDICINES = "";
				selectedRow.HEALTH_INSURANCE = originalRow.HEALTH_INSURANCE;
				selectedRow.DENTAL_PLAN = originalRow.DENTAL_PLAN;
				selectedRow.DRUGSTORE = originalRow.DRUGSTORE;
				selectedRow.TELEMEDICINA = originalRow.TELEMEDICINA;
				selectedRow.CUIDADO = originalRow.CUIDADO;

				// if (selectedRow.HEALTH_INSURANCE !== "") {
				// 	oView.byId("ipHealthInsurance").setValue(oPlansModel.LTEXT_BRHE);
				// } else {
				// 	oView.byId("ipHealthInsurance").setValue("");
				// }
				// if (selectedRow.DENTAL_PLAN !== "") {
				// 	oView.byId("ipDentalInsurance").setValue(oPlansModel.LTEXT_BRDE);
				// } else {
				// 	oView.byId("ipDentalInsurance").setValue("");
				// }

				// if (selectedRow.DRUGSTORE !== "") {
				// 	oView.byId("ipDrugstore").setValue(oPlansModel.LTEXT_BRDG);
				// } else {
				// 	oView.byId("ipDrugstore").setValue("");
				// }

				// if (selectedRow.TELEMEDICINA !== "") {
				// 	oView.byId("ipTelemedicina").setValue(oPlansModel.LTEXT_BRTM);
				// } else {
				// 	oView.byId("ipTelemedicina").setValue("");
				// }

				// if (selectedRow.CUIDADO !== "") {
				// 	oView.byId("ipCuidado").setValue(oPlansModel.LTEXT_BRAS);
				// } else {
				// 	oView.byId("ipCuidado").setValue("");
				// }

				//UPDATE RECORD ON THE SCREEN
				this.fFillDependentDetail(selectedRow);
			} else {
				//IT'S A NEW RECORD THAT IS BEING REMOVED - JUST EXCLUDE IT FROM TABLE
				var selectedIndex = this.getView().byId("tDependents").getSelectedIndex();
				var aData = oModelTable.getData();
				aData.splice(selectedIndex, 1);
				oModelTable.setData(aData);
			}
			oModelTable.refresh();
			//Clears the screen fields
			this.fClearFieldsToNewRecord();
		},
		//--------------------------------------------
		//	fFillBenefitsDesc
		//--------------------------------------------			
		fFillBenefitsDesc: function(benefitCode, value) {
			if (value !== "" && value !== " " && value !== undefined && value !== null) {
				var oBenefitsModel = this.getView().getModel("ET_PLANS");
				var fieldDesc = "LTEXT_" + benefitCode;
				for (var i in oBenefitsModel.oData) {
					if (i == fieldDesc) {
						return oBenefitsModel.oData[i];
					}
				}
			}
		},
		//--------------------------------------------
		//	fActionButtonsDataAttribute
		//--------------------------------------------		
		fActionButtonsDataAttribute: function(attribute) {
			var oView = this.getView();
			var oGlobalData = oView.getModel("ET_GLOBAL_DATA");

			oView.byId("btnCancelAction").setVisible(attribute);
			oView.byId("btnSaveAction").setVisible(attribute);

			// oView.byId("btnCancelDentalInsurance").setVisible(attribute);
			// oView.byId("btnAddDentalInsurance").setVisible(attribute);
			// oView.byId("btnCancelHealthInsurance").setVisible(attribute);
			// oView.byId("btnAddHealthInsurance").setVisible(attribute);

			if (attribute === false) {

				if (oGlobalData.MSG !== "998") {
					oView.byId("btnSave").setVisible(true);
					oView.byId("btnAccept").setVisible(true);

					if (oGlobalData.MSG === "997") {
						oView.byId("btnCancel").setVisible(true);
					} else {
						oView.byId("btnCancel").setVisible(false);
					}
				}

			} else {
				oView.byId("btnSave").setVisible(false);
				oView.byId("btnAccept").setVisible(false);
				oView.byId("btnCancel").setVisible(false);
			}
		},

		//--------------------------------------------
		//	onHelpRequestDependentBirthPlace
		//--------------------------------------------		
		onHelpRequestDependentBirthPlace: function() {
			var cols = [{
				label: "País",
				template: "COUNTRY"
			}, {
				label: "Região",
				template: "REGION"
			}, {
				label: "Cidade",
				template: "TEXT"
			}];
			this.fSearchHelpBirthPlace();
			this.fHelpRequest("", "TEXT", cols, "ET_SH_LOCAL_OF_BIRTH", this, "Nome do Município",
				"ipDependentBirthPlace", "ipDependentBirthPlace", true, false);
		},
		//	--------------------------------------------
		//	onHelpRequestDependentBirthCountry
		//	--------------------------------------------
		onHelpRequestDependentBirthCountry: function() {
			var cols = [{
				label: "Código",
				template: "LAND1"
			}, {
				label: "Descrição",
				template: "LANDX"
			}];
			this.fHelpRequest("LAND1", "LANDX", cols, "ET_SH_COUNTRY", this, "País",
				"ipDependentBirthCountry", "txtDependentBirthCountry", false, false);
		},
		//	--------------------------------------------
		//	fFillURLFilterParam
		//	--------------------------------------------		
		fFillURLFilterParam: function(param, value, url) {
			if (url === "" || typeof url === "undefined") {
				url = "$filter=";
			} else {
				url = url + " and ";
			}
			url = url + param + " eq '" + value + "'";
			return url;
		},
		//	--------------------------------------------
		//	fSearchHelpBirthPlace
		//	--------------------------------------------
		fSearchHelpBirthPlace: function() {
			var urlParam = "";
			var ipBirthCountry = this.getView().byId("ipDependentBirthCountry").getValue();
			var ipState = this.getView().byId("ipDependentRegion").getValue();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			if (ipBirthCountry !== "" && ipBirthCountry !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_COUNTRY", ipBirthCountry);
			}
			if (ipState !== "" && ipState !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_REGION", ipState, urlParam);
			}
			this.fSetSearchHelpValue(oModel, "ET_SH_LOCAL_OF_BIRTH", urlParam);
		},
		//	--------------------------------------------
		//	onHelpRequestDependentNationality
		//	--------------------------------------------
		onHelpRequestDependentNationality: function() {
			var cols = [{
				label: "País",
				template: "LAND1"
			}, {
				label: "Nacionalidade",
				template: "NATIO"
			}];
			this.fHelpRequest("LAND1", "NATIO", cols, "ET_SH_NATIONALITY", this, "Nacionalidade",
				"ipDependentNationality", "txtDependentNationality", false, false);
		},
		//--------------------------------------------
		//	onHelpRequestDependentRegion
		//--------------------------------------------		
		onHelpRequestDependentRegion: function() {
			var cols = [{
				label: "Código",
				template: "BLAND"
			}, {
				label: "Descrição",
				template: "BEZEI"
			}];
			this.fSearchHelpRegion();
			this.fHelpRequest("BLAND", "BEZEI", cols, "ET_SH_REGION", this, "Estado",
				"ipDependentRegion", "txtDependentRegion", false, false);
		},
		//	--------------------------------------------
		//	fSearchHelpRegion
		//	--------------------------------------------
		fSearchHelpRegion: function() {
			var urlParam = "";
			var ipBirthCountry = this.getView().byId("ipDependentBirthCountry").getValue();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			if (ipBirthCountry !== "" && ipBirthCountry !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_COUNTRY", ipBirthCountry);
			}
			this.fSetSearchHelpValue(oModel, "ET_SH_REGION", urlParam);
		},
		// --------------------------------------------
		// fValidInputFields
		// -------------------------------------------- 		
		fValidInputFields: function() {
			this.fObligatoryFields(); // - CR - somente no enviar - 16.05

			var dpDependentBirthDate = this.fVerifyError("dpDependentBirthDate");
			var ipDependentBirthCountry = this.fVerifyError("ipDependentBirthCountry");
			var ipDependentNationality = this.fVerifyError("ipDependentNationality");
			var ipDependentRegion = this.fVerifyError("ipDependentRegion");
			var ipDependentBirthPlace = this.fVerifyError("ipDependentBirthPlace");
			var ipDependentCpf = this.fVerifyError("ipDependentCpf");
			var ipDependentBornAliveNumber = this.fVerifyError("ipDependentBornAliveNumber");
			var ipDependentsMothersName = this.fVerifyError("ipDependentsMothersName");
			var ipDependentFullName = this.fVerifyError("ipDependentFullName");
			if (dpDependentBirthDate === false &&
				ipDependentBirthCountry === false && ipDependentNationality === false && ipDependentRegion === false &&
				ipDependentCpf === false && ipDependentBornAliveNumber === false && ipDependentsMothersName === false &&
				ipDependentBirthPlace === false && ipDependentFullName === false) {
				return false;
			} else {
				return true;
			}
		},
		//	--------------------------------------------
		//	fRemoveAllErrors
		//	--------------------------------------------		
		fRemoveAllErrors: function() {
			this.fMessage("None", null, "dpDependentBirthDate");
			this.fMessage("None", null, "ipDependentBirthCountry");
			this.fMessage("None", null, "ipDependentNationality");
			this.fMessage("None", null, "ipDependentRegion");
			this.fMessage("None", null, "ipDependentBirthPlace");
			this.fMessage("None", null, "ipDependentCpf");
			this.fMessage("None", null, "ipDependentBornAliveNumber");
			this.fMessage("None", null, "ipDependentsMothersName");
			this.fMessage("None", null, "ipDependentFullName");
		},
		//	--------------------------------------------
		//	fVerifyError
		//	--------------------------------------------		
		fVerifyError: function(field) {
			var fieldValue = this.getView().byId(field);
			if (fieldValue.getProperty("valueState") !== "Error") {
				return false;
			} else {
				return true;
			}
		},

		// --------------------------------------------
		// fUnableFields
		// --------------------------------------------  		
		fUnableFields: function() {
			var oView = this.getView();
			oView.byId("ipDependentFullName").setEditable(false);
			oView.byId("dpDependentBirthDate").setEditable(false);
			oView.byId("ipDependentBirthCountry").setEditable(false);
			oView.byId("ipDependentNationality").setEditable(false);
			oView.byId("ipDependentRegion").setEditable(false);
			oView.byId("ipDependentBirthPlace").setEditable(false);
			oView.byId("ipDependentCpf").setEditable(false);
			oView.byId("ipDependentBornAliveNumber").setEditable(false);
			oView.byId("ipDependentsMothersName").setEditable(false);
			oView.byId("rbgSex").setEditable(false);

			oView.byId("cbInvalidDependent").setEnabled(false);
			oView.byId("cbStudentDependent").setEnabled(false);
			oView.byId("cbDependentFamilySalary").setEnabled(false);
			oView.byId("cbDependentIncomeTax").setEnabled(false);

			oView.byId("taJust").setEditable(false);
			//oView.byId("btnCancelHealthInsurance").setEnabled(false);
			//oView.byId("btnCancelDentalInsurance").setEnabled(false);
			//oView.byId("btnAddDentalInsurance").setEnabled(false);
			oView.byId("slMemberType").setEnabled(false);

			oView.byId("btnAddDep").setVisible(false);
			oView.byId("btnModDep").setVisible(false);
			oView.byId("btnDelimitDep").setVisible(false);
		},

		// --------------------------------------------
		// fObligatoryFields
		// --------------------------------------------  		
		fObligatoryFields: function() {
			this.fValidationObligatoryFields("ipDependentCpf");
			this.fValidationObligatoryFields("ipDependentBornAliveNumber");
			this.fValidationObligatoryFields("dpDependentBirthDate");
			this.fValidationObligatoryFields("ipDependentBirthCountry");
			this.fValidationObligatoryFields("ipDependentNationality"); //Região
			this.fValidationObligatoryFields("ipDependentRegion");
			this.fValidationObligatoryFields("ipDependentBirthPlace"); //Dependente
			this.fValidationObligatoryFields("ipDependentsMothersName");
			this.fValidationObligatoryFields("ipDependentFullName");
		},
		// --------------------------------------------
		// fCreateRequisition
		// -------------------------------------------- 
		fCreateRequisition: function(that, action, req, newDt) {
			var oCreate = {};
			var oView = this.getView();
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var closedReqModel = this.getView().getModel("ET_CLOSED_REQUISITION");
			var observation;
			if (oGlobalData.IM_LOGGED_IN == 5) {
				observation = that.getView().byId("taJustSSG").getValue();
			} else {
				observation = that.getView().byId("taJust").getValue();
			}
			oCreate = {
				"IM_ACTION": action,
				"IM_LOGGED_IN": oGlobalData.IM_LOGGED_IN,
				"IM_PERNR": oGlobalData.IM_PERNR,
				"IM_REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
				"IM_BUKRS": oGlobalData.IM_BUKRS,
				"OBSERVATION": observation
			};

			that.fFillCreateDependentsData(oCreate, that, action, req, newDt);

			//SUCESSO
			function fSuccess(oEvent) {

				that.obligatoryChanged = false;

				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
					case "A":
						MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
						that.fUnableAllButtons(that);
						that.fVerifyAction(false, "A");
						break;
					case "D":
						MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " reprovada!");
						that.fUnableAllButtons(that);
						that.fVerifyAction(false, "D");
						break;
					case "S":
						that.fSucessMessageFromSendAction(oEvent);
						that.fVerifyAction(false, "S");
						oView.byId("btnCancel").setEnabled(false);
						oView.byId("btnSave").setEnabled(false);
						// oView.byId("btnSanity").setEnabled(false);
						oView.byId("btnAccept").setEnabled(false);
						closedReqModel.CLOSED = "X";
						// *** ANEXO ***
						that.saveAttachment(oGlobalData.IM_REQUISITION_ID, 'S');
						that.closeDmsDocument(oGlobalData.IM_REQUISITION_ID);
						break;
					case "C":
						MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");
						that.getView().byId("tDependents").setSelectedIndex(-1);

						that.fGetBlock();
						var oUploadCollection = that.getView().byId("upldAttachments");
						oUploadCollection.destroyItems();
						that.fVerifyAction(false, "C");
						// *** ANEXO ***
						var oAtt = new JSONModel({
							table: []
						});
						that.getView().setModel(oAtt, "Attachments");
						break;
					case "X":
						MessageBox.success("Dados confirmados com sucesso! Obrigado por validar suas informações para o eSocial");
						// that.getView().byId("btnSanity").setVisible(false);
						oGlobalData.IM_REQUISITION_ID = "00000000";
						break;
					case "R":
						MessageBox.success(
							"Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
						);
						// *** ANEXO ***
						that.fAttachment(oGlobalData.IM_REQUISITION_ID, that, false, true);
						that.fSetGlobalInformation(oEvent, that, undefined, true);
						that.fVerifyAction(false, "R");
						// that.getView().byId("btnSanity").setVisible(false);
						that.getView().byId("btnCancel").setVisible(true);
						that.getView().byId("btnAccept").setEnabled(true);
						// *** ANEXO ***
						that.saveAttachment(oGlobalData.IM_REQUISITION_ID, 'G');
						break;
				}
				that.getView().byId("tDependents").setSelectedIndex(-1);
				that.fGetLog();
			}

			//ERRO
			function fError(oEvent) {
				oGlobalData.IM_REQUISITION_ID = that.fGetRequisitionId(oEvent);
				if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
					var message = $(oEvent.response.body).find('message').first().text();
					if (message === undefined || message === "" || message === " ") {
						message = "Erro inesperado. Favor contactar o administrador do sistema";
					}
					MessageBox.error(message);
				} else {
					var detail = $(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body);
					var formattedDetail = (detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", ""));
					formattedDetail = formattedDetail.replace("error", "");
					MessageBox.error(formattedDetail);
				}
			}
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			oModel.create("ET_DEPENDENTS", oCreate, null, fSuccess, fError);
		},
		// --------------------------------------------
		// fFillCreateDependentsData
		// --------------------------------------------			
		fFillCreateDependentsData: function(oCreate, that, action, req, newDt) {
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			var modelTable = this.getView().byId("tDependents").getModel();
			var DEPENDENTS = new sap.ui.model.json.JSONModel([]);
			var actioBlock;

			if (newDt === "" || newDt === undefined) {
				newDt = null;
			}

			for (var i = 0; i < modelTable.oData.length; i++) {
				//User can save/cancel a requisition without inputting required data. However, DATE is only acceptable by gateway if it's null
				if (action === "R" || action === "C") {
					if (modelTable.oData[i].FGBDT === "" || modelTable.oData[i].FGBDT === " " || modelTable.oData[i].FGBDT === undefined) {
						modelTable.oData[i].FGBDT = null;
					}
				}
				//Extra validations
				if (modelTable.oData[i].ENDDA_DELIM === "" || modelTable.oData[i].ENDDA_DELIM === " " || modelTable.oData[i].ENDDA_DELIM ===
					undefined || modelTable.oData[i].ENDDA_DELIM === null) {
					modelTable.oData[i].ENDDA_DELIM = null;
				}
				if (modelTable.oData[i].STATUS === "Novo") {
					actioBlock = "INS";
				} else {
					actioBlock = modelTable.oData[i].ACTIO_BLOCK;
				}

				//Benefits Actions
				this.fSetBenefitsActions(modelTable.oData[i], actioBlock);

				DEPENDENTS.getData().push(({
					"REQUISITION_ID": oGlobalData.IM_REQUISITION_ID,
					"SUBTY": modelTable.oData[i].SUBTY,
					"OBJPS": modelTable.oData[i].OBJPS,
					"FGBDT": modelTable.oData[i].FGBDT,
					"FGBLD": modelTable.oData[i].FGBLD,
					"FANAT": modelTable.oData[i].FANAT,
					"FASEX": modelTable.oData[i].FASEX,
					"FANAM": modelTable.oData[i].FANAM,
					"FGBOT": modelTable.oData[i].FGBOT,
					"UFBOT": modelTable.oData[i].UFBOT,
					"CARTO": modelTable.oData[i].CARTO,
					"NOREG": modelTable.oData[i].NOREG,
					"NOLIV": modelTable.oData[i].NOLIV,
					"NOFOL": modelTable.oData[i].NOFOL,
					"DTENT": null, //this field is no longer used
					"ICNUM": modelTable.oData[i].ICNUM,
					"MOTHE": modelTable.oData[i].MOTHE,
					"LBCNR": modelTable.oData[i].LBCNR,
					"NOREU": modelTable.oData[i].NOREU,
					"STINV": modelTable.oData[i].STINV,
					"SALFA": modelTable.oData[i].SALFA,
					"IRFLG": modelTable.oData[i].IRFLG,
					"ESTUD": modelTable.oData[i].ESTUD,
					"FCNAM": modelTable.oData[i].FCNAM,
					"HEALTH_INSURANCE": modelTable.oData[i].HEALTH_INSURANCE,
					"DENTAL_PLAN": modelTable.oData[i].DENTAL_PLAN,
					"DRUGSTORE": modelTable.oData[i].DRUGSTORE,
					"TELEMEDICINA": modelTable.oData[i].TELEMEDICINA,
					"CUIDADO": modelTable.oData[i].CUIDADO,
					"ACTIO_BLOCK": actioBlock,
					"ACTIO_DENTAL_PLAN": modelTable.oData[i].ACTIO_DENTAL_PLAN,
					"ACTIO_HEALTH_INSURANCE": modelTable.oData[i].ACTIO_HEALTH_INSURANCE,
					"ACTIVE_DENTAL_PLAN": modelTable.oData[i].ACTIVE_DENTAL_PLAN,
					"ACTIVE_HEALTH_INSURANCE": modelTable.oData[i].ACTIVE_HEALTH_INSURANCE,
					"ACTIVE_MEDICINES": modelTable.oData[i].ACTIVE_MEDICINES,
					"ACTIVE_TELEMEDICINA": modelTable.oData[i].ACTIVE_TELEMEDICINA,
					"ACTIVE_CUIDADO": modelTable.oData[i].ACTIVE_CUIDADO,
					"ACTIO_MEDICINES": modelTable.oData[i].ACTIO_MEDICINES,
					"ACTIO_TELEMEDICINA": modelTable.oData[i].ACTIO_TELEMEDICINA,
					"ACTIO_CUIDADO": modelTable.oData[i].ACTIO_CUIDADO,
					"ENDDA_DELIM": modelTable.oData[i].ENDDA_DELIM,
					"STATUS": modelTable.oData[i].STATUS,
					"MEMBER": modelTable.oData[i].MEMBER,
					"SSG_DATE": newDt,
					"TYPE_SAVE": req
				}));
			}

			oCreate.DEPENDENTS = DEPENDENTS.getData();
		},

		// --------------------------------------------
		// fSetBenefitsActions
		// -------------------------------------------- 		
		fSetBenefitsActions: function(selectedRow, actioBlock) {

			selectedRow.ACTIO_HEALTH_INSURANCE = "";
			selectedRow.ACTIO_DENTAL_PLAN = "";
			selectedRow.ACTIO_MEDICINES = "";
			selectedRow.ACTIO_TELEMEDICINA = "";
			selectedRow.ACTIO_CUIDADO = "";

			if (actioBlock === "INS" || actioBlock === "DEL") {
				if (selectedRow.HEALTH_INSURANCE.trim() !== "") {
					selectedRow.ACTIO_HEALTH_INSURANCE = actioBlock;
				}

				if (selectedRow.DENTAL_PLAN.trim() !== "") {
					selectedRow.ACTIO_DENTAL_PLAN = actioBlock;
				}

				if (selectedRow.DRUGSTORE.trim() !== "") {
					selectedRow.ACTIO_MEDICINES = actioBlock;
				}

				if (selectedRow.TELEMEDICINA.trim() !== "") {
					selectedRow.ACTIO_TELEMEDICINA = actioBlock;
				}

				if (selectedRow.CUIDADO.trim() !== "") {
					selectedRow.ACTIO_CUIDADO = actioBlock;
				}

			} else if (actioBlock === "MOD") {
				var originalRow = this.fGetOriginalRowModel(selectedRow);

				// não elegivel
				if (selectedRow.HEALTH_INSURANCE === "BRIN" && originalRow.HEALTH_INSURANCE.trim() === "") {
					selectedRow.HEALTH_INSURANCE = "";
				}

				if (selectedRow.HEALTH_INSURANCE.trim() !== originalRow.HEALTH_INSURANCE.trim()) {
					if (selectedRow.HEALTH_INSURANCE.trim() === "") {
						selectedRow.ACTIO_HEALTH_INSURANCE = "DEL";
					} else {
						selectedRow.ACTIO_HEALTH_INSURANCE = "INS";
					}
				} else {
					selectedRow.ACTIO_HEALTH_INSURANCE = originalRow.ACTIO_HEALTH_INSURANCE;
				}

				if (selectedRow.DENTAL_PLAN.trim() !== originalRow.DENTAL_PLAN.trim()) {
					if (selectedRow.DENTAL_PLAN.trim() === "") {
						selectedRow.ACTIO_DENTAL_PLAN = "DEL";
					} else {
						selectedRow.ACTIO_DENTAL_PLAN = "INS";
					}
				} else {
					selectedRow.ACTIO_DENTAL_PLAN = originalRow.ACTIO_DENTAL_PLAN;
				}

				if (selectedRow.DRUGSTORE.trim() !== originalRow.DRUGSTORE.trim()) {
					if (selectedRow.DRUGSTORE.trim() === "") {
						selectedRow.ACTIO_MEDICINES = "DEL";
					} else {
						selectedRow.ACTIO_MEDICINES = "INS";
					}
				} else {
					selectedRow.ACTIO_MEDICINES = originalRow.ACTIO_MEDICINES;
				}

				if (selectedRow.TELEMEDICINA.trim() !== originalRow.TELEMEDICINA.trim()) {
					if (selectedRow.TELEMEDICINA.trim() === "") {
						selectedRow.ACTIO_TELEMEDICINA = "DEL";
					} else {
						selectedRow.ACTIO_TELEMEDICINA = "INS";
					}
				} else {
					selectedRow.ACTIO_TELEMEDICINA = originalRow.ACTIO_TELEMEDICINA;
				}

				if (selectedRow.CUIDADO.trim() !== originalRow.CUIDADO.trim()) {
					if (selectedRow.CUIDADO.trim() === "") {
						selectedRow.ACTIO_CUIDADO = "DEL";
					} else {
						selectedRow.ACTIO_CUIDADO = "INS";
					}
				} else {
					selectedRow.ACTIO_CUIDADO = originalRow.ACTIO_CUIDADO;
				}
			}

		},

		// --------------------------------------------
		// fActions
		// -------------------------------------------- 		
		fActions: function(that, actionText, action, req, newDt) {
			var question;
			switch (action) {
				case "A": //Approve
					question = "Confirmar aprovação?";
					break;
				case "D": //Decline
					question = "Confirmar reprovação?";
					break;
				case "C": //Cancel
					question = "Confirmar cancelamento?";
					break;
				default:
					question = "Confirmar " + actionText + "?";
			}
			MessageBox.confirm(question, {
				title: actionText,
				initialFocus: sap.m.MessageBox.Action.CANCEL,
				onClose: function(sButton) {
					if (sButton === MessageBox.Action.OK) {
						that.fCreateRequisition(that, action, req, newDt);
						return true;
					}
				}
			});
		},
		// --------------------------------------------
		// onSave
		// --------------------------------------------  
		onSave: function() {
			var attachment = this.fValidAttachment();

			if (attachment === false) {
				this.handleErrorMessageAttachment();
				return;
			}
			this.fActions(this, "gravação", "R");
		},

		// --------------------------------------------
		// fVerifyIfAttachmentIsRequired
		// --------------------------------------------		
		fVerifyIfAttachmentIsRequired: function() {
			var modelTable = this.getView().byId("tDependents").getModel().getData();
			var aOrigData;
			var attachmentRequired = false;
			var oLog = this.getView().getModel("ET_LOG_DEP");
			var aLog;

			if (oLog !== undefined && oLog.getData().length > 0) {
				aLog = oLog.getData();
			}

			for (var i = 0; i < modelTable.length; i++) {
				switch (modelTable[i].ACTIO_BLOCK.trim()) {
					default:
					//No changed record
						continue;
					case "INS":
							attachmentRequired = true;
						this.obligatoryChanged = true;
						break;

					case "DEL":
							attachmentRequired = true;
						this.obligatoryChanged = true;
						break;

					case "MOD":
							if (aLog !== undefined && this.obligatoryChanged === false) {
								for (var j = 0; j < aLog.length; j++) {

									if (aLog[j].SUBTY === modelTable[i].SUBTY && aLog[j].OBJPS === aLog[j].OBJPS) {
										if (aLog[j].SUBTY === "11" || aLog[j].SUBTY === "12") {
											if (aLog[j].FIELD === "lblDependentIncomeTax") {
												this.obligatoryChanged = true;
												break;
											}
										} else {
											if (aLog[j].FIELD === "lblDependentFullName" ||
												aLog[j].FIELD === "lblSex" ||
												aLog[j].FIELD === "lblDependentBirthDate" ||
												aLog[j].FIELD === "lblCpf" ||
												aLog[j].FIELD === "lblDependentBornAliveNumber" ||
												aLog[j].FIELD === "lblDependentsMothersName" ||
												aLog[j].FIELD === "lblInvalidDependent" ||
												aLog[j].FIELD === "lblStudentDependent" ||
												aLog[j].FIELD === "lblDependentFamilySalary" ||
												aLog[j].FIELD === "lblDependentIncomeTax"
												// || aLog[j].FIELD === "lblDrugstore" ||
												// aLog[j].FIELD === "lblTelemedicina" ||
												// aLog[j].FIELD === "lblCuidado" ||
												// aLog[j].FIELD === "lblHealthInsurance" ||
												// aLog[j].FIELD === "lblDentalInsurance"
											) {

												this.obligatoryChanged = true;
												break;
											}
										}
									}
								}
							}

							//Father and Mother - Attachment is not obligatory unless they're part of IR
						if (modelTable[i].SUBTY === "11" || modelTable[i].SUBTY === "12") {
							//Gets de Original Row of the current record
							aOrigData = this.fGetOriginalRowModel(modelTable[i]);

							if (aOrigData.IRFLG !== modelTable[i].IRFLG) {
								attachmentRequired = true;
							} else {
								attachmentRequired = false;
							}

						} else {
							//Gets de Original Row of the current record
							aOrigData = this.fGetOriginalRowModel(modelTable[i]);

							//Attachment is not obligatory when changed ONLY country, state, nationality or Local of Birth
							if (aOrigData !== undefined) {
								if (modelTable[i].FCNAM.trim() !== aOrigData.FCNAM.trim() ||
									modelTable[i].FASEX !== aOrigData.FASEX ||
									modelTable[i].FGBDT !== aOrigData.FGBDT ||
									modelTable[i].ICNUM !== aOrigData.ICNUM ||
									modelTable[i].LBCNR !== aOrigData.LBCNR ||
									modelTable[i].MOTHE !== aOrigData.MOTHE ||
									modelTable[i].STINV !== aOrigData.STINV ||
									modelTable[i].ESTUD !== aOrigData.ESTUD ||
									modelTable[i].SALFA !== aOrigData.SALFA ||
									modelTable[i].IRFLG !== aOrigData.IRFLG ||
									modelTable[i].DRUGSTORE !== aOrigData.DRUGSTORE ||
									modelTable[i].HEALTH_INSURANCE !== aOrigData.HEALTH_INSURANCE ||
									modelTable[i].DENTAL_PLAN !== aOrigData.DENTAL_PLAN) {

									attachmentRequired = true;
									break;
								}
							}
						}
				}
			}

			return attachmentRequired;
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function() {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");
			//var modelTable = this.getView().byId("tDependents").getModel().getData();

			if (this.fVerifyObligatoryFieldsGlobal("S") !== true) {
				var attachment = this.fValidAttachment();
				var attachmentRequired = false;

				if (!attachment) {
					/*					for (var i = 0; i < modelTable.length; i++) {
											if (modelTable[i].ACTIO_BLOCK.trim() === "" || ((modelTable[i].SUBTY === "11" || modelTable[i].SUBTY === "12")) && modelTable[i]
												.ACTIO_BLOCK === "MOD") {
												continue;
											}
											attachmentRequired = true;
										}*/

					attachmentRequired = this.fVerifyIfAttachmentIsRequired();
				}

				if (attachmentRequired === true || (attachment === false && this.obligatoryChanged === true)) {
					this.handleErrorMessageAttachment();
				} else {
					MessageBox.confirm(
						message, {
							title: "Termo de responsabilidade",
							initialFocus: sap.m.MessageBox.Action.CANCEL,
							onClose: function(sButton) {
								if (sButton === MessageBox.Action.OK) {
									that.fActions(that, "envio", "S");
								}
							}
						});
				}
			}
		},
		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function() {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();
			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Cancelamento", "C");
			}
		},
		// --------------------------------------------
		// onSanitation
		// --------------------------------------------  
		onSanitation: function() {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			if (this.fVerifyObligatoryFieldsGlobal("X") !== true) {
				MessageBox.confirm(
					message, {
						title: "Termo de responsabilidade",
						initialFocus: sap.m.MessageBox.Action.CANCEL,
						onClose: function(sButton) {
							if (sButton === MessageBox.Action.OK) {
								that.fActions(that, "saneamento", "X");
							}
						}
					});
			}

		},
		// --------------------------------------------
		// onApprove
		// -------------------------------------------- 

		onApprove: function() {

			var modelTable = this.getView().byId("tDependents").getModel().getData();
			var i;
			var definicao = false;

			for (i = 0; i < modelTable.length; i++) {
				if (modelTable[i].ACTIO_BLOCK === "DEL" || modelTable[i].ACTIO_BLOCK === "INS") {
					definicao = true;
					break;
				}
			}

			if (definicao === true) {
				this.fActions(this, "Aprovação", "A");
			} else {

				var newDt;

				this.fActions(this, "Aprovação", "A", "M", newDt);
				// this._Dialog = sap.ui.xmlfragment("autoServico.view.TypeReq", this);

				// this._Dialog.open();
			}

		},

		onSelect: function(oEvent) {

			var selecao = oEvent.getParameter('selectedIndex');
			if (selecao === 1) {
				sap.ui.getCore().byId("DataEfetiva").setVisible(true);
			} else if (selecao === 0) {
				sap.ui.getCore().byId("DataEfetiva").setVisible(false);
			}

		},

		handleChange: function() {
			var data = sap.ui.getCore().byId("data").getValue();
			var dataCompara = new Date();
			data = data.substring(3, 5) + "." + data.substring(0, 2) + "." + data.substring(6, 10);
			var data2 = new Date(data);

			dataCompara.setHours("00", "00", "00", "00");

			if (data2 < dataCompara) {
				MessageBox.error("A data não pode ser anterior a hoje.");
				sap.ui.getCore().byId("data").setValue("");
			}
		},

		// --------------------------------------------
		// onContinue
		// -------------------------------------------- 

		onContinue: function(oEvent) {

			var evoluir = sap.ui.getCore().byId("evoluir_req").getSelected();
			// var manter = sap.ui.getCore().byId("manter").getSelected();
			var data = sap.ui.getCore().byId("data").getValue();
			var req;
			var selecionado = sap.ui.getCore().byId("rbg")._oItemNavigation.iSelectedIndex;
			var dateFormat = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "yyyy-MM-ddT00:00:00"
			});

			if (evoluir === true && data === "") {
				MessageBox.error("Data de efetivação é obrigatória!");
				return "";
			}

			if (data !== "") {
				data = data.substring(3, 5) + "." + data.substring(0, 2) + "." + data.substring(6, 10);
				var dt = new Date(data);
				var newDt = dateFormat.format(new Date(dt));
			}

			if (selecionado === 0) {
				req = "M";
			} else if (selecionado === 1) {
				req = "E";
			}

			this._Dialog.destroy();

			this.fActions(this, "Aprovação", "A", req, newDt);
		},

		// onApprove: function () {
		// 	this.fActions(this, "Aprovação", "A");
		// },
		// --------------------------------------------
		// onReject
		// --------------------------------------------  
		onReject: function() {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();
			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Rejeição", "D");
			}
		},
		showDialogAnexo: function() {

			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (!oDialog) {
				oDialog = new Anexo(this.getView()); //Justificar ausencia

				this.mDialogs[sDialogName] = oDialog;

				// For navigation.
				oDialog.setRouter(this.oRouter);
			}

			oDialog.open(this.changedData, "103");
			//this.changedData = []; //TGE388990
		},
		saveAttachment: function(reqNumber, status) {
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (oDialog) {
				oDialog.saveAttachment(reqNumber, status);
			}
		},
		closeDmsDocument: function (reqNumber) {
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (oDialog) {
				oDialog.setDocumentStatus(reqNumber, 'S');
			}
		},
		getAttachment: function() {

			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (!oDialog) {
				oDialog = new Anexo(this.getView()); //Justificar ausencia

				this.mDialogs[sDialogName] = oDialog;

				// For navigation.
				oDialog.setRouter(this.oRouter);
			}

			oDialog.getAttachment();
		}
	});
});