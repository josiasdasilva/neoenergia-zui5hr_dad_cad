sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"autoServico/view/BaseController",
	"autoServico/formatter/Formatter",
	"autoServico/view/Anexo",
	"sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, Anexo, JSONModel) {
	"use strict";

	return BaseController.extend("autoServico.view.DetailDocuments", {

		onInit: function () {
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

			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSearchHelps();
			this.fSetHeader();
			this.fSetGlobalInformation();
			//this.fGetBlock();
			//this.fValidaCompany();
			//this.getView().byId("btnSave").setVisible(false);
			//this.getView().byId("btnAccept").setEnabled(true);
			//this.getAttachment();
			const that = this;
			this.getView().addEventDelegate({onBeforeShow: function(oEvent){that.initializeState(that)}}, this.getView());
		},
		initializeState: function (ref) {
			const sDialogName = 'Anexo';
			ref.mDialogs = ref.mDialogs || {};
			const oDialog = ref.mDialogs[sDialogName];

			if (oDialog) {
				oDialog.clearAttachments();
			}
			
			ref.fGetBlock();
			ref.fValidaCompany();
			ref.getView().byId("btnSave").setVisible(false);
			ref.getView().byId("btnAccept").setEnabled(true);
			ref.getAttachment();
		},
		// // --------------------------------------------
		// // fCheckChange
		// // -------------------------------------------- 
		fCheckChange: function (obj1, obj2) {
			var oOrigModel = this.getView().getModel("ET_DOCUMENTS_ORIG");

			if ((obj1.IDENT_NR_0002 !== obj2.IDENT_NR_0002) || (obj1.DOC_ISSUER_0002 !== obj2.DOC_ISSUER_0002) ||
				(oOrigModel.OBLIGATORY_0004 !== "" && ((obj1.CREG_INIT_0004 !== obj2.CREG_INIT_0004) || (obj1.CREG_NAME_0004 !== obj2.CREG_NAME_0004) ||
					(obj1.CREG_NR_0004 !== obj2.CREG_NR_0004) || (obj1.DOC_ISSUER_0004 !== obj2.DOC_ISSUER_0004) || (obj1.DT_EMIS_0004 !== obj2.DT_EMIS_0004)
				)) ||

				(oOrigModel.OBLIGATORY_0010 !== "" && ((obj1.DRIVE_NR_0010 !== obj2.DRIVE_NR_0010) || (obj1.DOC_ISSUER_0010 !== obj2.DOC_ISSUER_0010) ||
					(obj1.DRIVE_CAT_0010 !== obj2.DRIVE_CAT_0010) || (obj1.DT_EMIS_0010 !== obj2.DT_EMIS_0010) || (obj1.ENDDA_0010 !== obj2.ENDDA_0010) ||
					(obj1.PRIHABDAT_0010 !== obj2.PRIHABDAT_0010))) ||

				//CR - 30.05 - CTPS Date is no longer obligatory
				(oOrigModel.APPRENTICE === "" && ((obj1.CTPS_NR_0003 !== obj2.CTPS_NR_0003) || (obj1.ES_EMIS_0003 !== obj2.ES_EMIS_0003) ||
					//(obj1.DT_EMIS_0003 !== obj2.DT_EMIS_0003) || (obj1.CTPS_SERIE_0003 !== obj2.CTPS_SERIE_0003) || (obj1.PIS_NR_0006 !== obj2.PIS_NR_0006)
					(obj1.CTPS_SERIE_0003 !== obj2.CTPS_SERIE_0003) || (obj1.PIS_NR_0006 !== obj2.PIS_NR_0006)
				))) {
				return true;
			} else {
				return false;
			}

		},

		// --------------------------------------------
		// onPress
		// -------------------------------------------- 
		onPress: function (oEvent) {
			var buttonName = oEvent.getParameter("id").substring(12);
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var oQuickViewModelText;

			switch (buttonName) {
			case "btnQuickViewHelp":
				this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpDocuments", this);
				break;

			case "btnQuickViewCpf":
				var oQuickViewModelText = new sap.ui.model.json.JSONModel({
					text: "Campo CPF não está disponível para modificações. Caso necessário, abrir solicitação via Auto Atendimento",
					header: "CPF"
				});
				this._Dialog = sap.ui.xmlfragment("autoServico.view.QuickView", this);
				break;
			}

			sap.ui.getCore().setModel(oQuickViewModelText, "ET_QUICK_VIEW_TEXT");
			this._Dialog.open();
		},

		// --------------------------------------------
		// onClose
		// -------------------------------------------- 
		onClose: function () {
			this._Dialog.close();
		},

		//	--------------------------------------------
		//	fValidatePIS
		//	--------------------------------------------
		fValidatePIS: function (strPIS) {
			var ftap = "3298765432";
			var total = 0;
			var i;
			var resto = 0;
			var numPIS = 0;
			var strResto = "";
			var resultado;

			total = 0;
			resto = 0;
			numPIS = 0;
			strResto = "";

			numPIS = strPIS;

			if (numPIS == "" || numPIS == null) {
				return false;
			}

			for (i = 0; i <= 9; i++) {
				resultado = (numPIS.slice(i, i + 1)) * (ftap.slice(i, i + 1));
				total = total + resultado;
			}

			resto = (total % 11);

			if (resto != 0) {
				resto = 11 - resto;
			}

			if (resto == 10 || resto == 11) {
				strResto = resto + "";
				resto = strResto.slice(1, 2);
			}

			if (resto != (numPIS.slice(10, 11))) {
				return false;
			}

			return true;
		},

		//	--------------------------------------------
		//	onPISChange 
		//	--------------------------------------------
		onPISChange: function (e) {

			if (this.getView().byId("ipPisPasep").getValue() !== "") {
				if (this.fValidatePIS(e.oSource.getValue())) {
					this.fMessage("None", null, "ipPisPasep");
					this.getView().byId("btnAccept").setEnabled(true);
					this.getView().byId("btnSave").setEnabled(true);
				} else {
					this.fMessage("Error", "entrada_invalida", "ipPisPasep");
				}
			} else {

				if (this.getView().byId("ipPisPasep").getValueStateText === "Entrada Inválida") {
					this.fMessage("None", null, "ipPisPasep");
					this.getView().byId("btnAccept").setEnabled(true);
					this.getView().byId("btnSave").setEnabled(true);
				}

			}
		},

		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			// var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
			var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);

			function fSuccess(oEvent) {

				var is_approver = oEvent.EX_IS_APPROVER;
				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);

				that.getView().setModel(oValue, "ET_DOCUMENTS");

				//Isolates the model
				var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
				that.getView().setModel(oDataOrig, "ET_DOCUMENTS_ORIG");

				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);

				if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}

				if (oEvent.BLOCK.MARRY_BR_0009 === "X") {
					that.getView().byId("cbBrazilianPartner").setSelected(true);
				} else {
					that.getView().byId("cbBrazilianPartner").setSelected(false);
				}

				if (oEvent.BLOCK.CHILDBR_0009 === "X") {
					that.getView().byId("cbBrazilianChildren").setSelected(true);
				} else {
					that.getView().byId("cbBrazilianChildren").setSelected(false);
				}

				that.getView().byId("slCondTrabEstrag").setSelectedKey(oEvent.BLOCK.COND_TRAB_0009);

				//  			Campos referentes a um Estrangeiro somente irão ser exibidos caso campo NATIO esteja
				//  			diferente de BR(significando ser um não brasileiro)
				if (oEvent.BLOCK.NATIO !== "BR") {
					that.getView().byId("formPassport").setVisible(true);
					that.getView().byId("formForeignersIdentityCard").setVisible(true);
					that.getView().byId("formForeignVisa").setVisible(true);
				} else {
					that.getView().byId("formPassport").setVisible(false);
					that.getView().byId("formForeignersIdentityCard").setVisible(false);
					that.getView().byId("formForeignVisa").setVisible(false);
				}

				//Verify the obligatory fields according to the profile of the CBO (ECC)
				that.fSetObligatoryFieldsAccordingToCBO(that);

				//Verify the obligatory fields according to the profile of the Employee subgroup (ECC)
				that.fSetObligatoryFieldsAccordingToSubgroup(that);

				// se tem id verificar os anexos
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {

					var filters = [];

					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];

					that.getView().setModel(oModel, "anexo");

					// Update list binding
					that.getView().byId("upldAttachments").getBinding("items").filter(filters);

				}else{
					MessageBox.warning("Anexar comprovante dos documentos a serem ajustados e enviar para aprovação");
				}

				if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A") {
					if ((oEvent.BLOCK.REQUISITION_ID !== null || oEvent.BLOCK.REQUISITION_ID !== "" || oEvent.BLOCK.REQUISITION_ID !== undefined) &
						oEvent.BLOCK.REQUISITION_ID !== "00000000") {

						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
						}

					}

				}

				that.fSetGlobalInformation(oEvent, that);
				that.fVerifyAction();
				that.fGetLog();

				var oBindingModel = new sap.ui.model.Binding(oValue, "/", oValue.getContext("/"));
				that.oClonedObject = that.getClonedObject(oValue.oData);

				oBindingModel.attachChange(function () {
					that.modelHasChanged = that.fCheckChange(this.oModel.oData, that.oClonedObject);
				});

				that.fChangeScreen(that);

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

			oModel.read("ET_DOCUMENTS" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fSetObligatoryFieldsAccordingToSubgroup
		// 0003 - CTPS		
		// 0006 - PIS
		//	--------------------------------------------
		fSetObligatoryFieldsAccordingToSubgroup: function (that) {
			var oOrigModel = that.getView().getModel("ET_DOCUMENTS_ORIG");
			var oView = that.getView();

			if (oOrigModel.APPRENTICE === "") {
				//CR - 30.05 - CTPS Date is no longer obligatory
				oView.byId("lblCtps").setRequired(true);
				oView.byId("lblCtpsSeries").setRequired(true);
				//oView.byId("lblEmissionDateCTPS").setRequired(true);
				oView.byId("lblEmitterCtps").setRequired(true);
				oView.byId("lblPis").setRequired(true);
			}
		},

		//	--------------------------------------------
		//	fSetObligatoryFieldsAccordingToCBO
		// 0004 - Conselho Regional
		// 0010 - CNH
		//	--------------------------------------------		
		fSetObligatoryFieldsAccordingToCBO: function (that) {
			var oOrigModel = that.getView().getModel("ET_DOCUMENTS_ORIG");
			var oView = that.getView();
			var obligatory0004 = false;
			var obligatory0010 = false;

			if (oOrigModel.OBLIGATORY_0004 !== "") {
				obligatory0004 = true;
			}

			if (oOrigModel.OBLIGATORY_0010 !== "") {
				obligatory0010 = true;
			}

			oView.byId("lblRegionalCouncilNumber").setRequired(obligatory0004);
			oView.byId("lblRegionalCouncilName").setRequired(obligatory0004);
			oView.byId("lblRegionalCouncilInitials").setRequired(obligatory0004);

			oView.byId("lblDriversLicenseNumber").setRequired(obligatory0010);
			oView.byId("lblDriversLicenseOrgan").setRequired(obligatory0010);
			oView.byId("lblDriversLicenseCategory").setRequired(obligatory0010);
			oView.byId("lblDriversLicenseEmissionDate").setRequired(obligatory0010);
			oView.byId("lblDriversLicenseDueDate").setRequired(obligatory0010);
		},

		//	--------------------------------------------
		//	onFieldChange
		//	--------------------------------------------		
		onFieldChange: function (oEvent) {
			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);

			this.fMessage("None", null, fieldName);

			if (fieldName !== "cbBrazilianPartner" & fieldName !== "cbBrazilianChildren") {
				if (this.getView().byId(fieldName).getRequired() === true) {
					this.fValidationObligatoryFields(fieldName);
				}
			}

			if (fieldName !== "cbBrazilianPartner" & fieldName !== "cbBrazilianChildren") {
				if (this.getView().byId(fieldName).getRequired() === true) {
					this.fValidationObligatoryFields(fieldName);
				}
			}
			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},

		//	--------------------------------------------
		//	onFieldLiveChange
		//	--------------------------------------------		
		onFieldLiveChange: function (oEvent) {
			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);

			this.fConvertToUppercase(fieldName);

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var urlParam = "";

			urlParam = this.fFillURLFilterParam("IM_COUNTRY", "BR");
			this.fSetSearchHelpValue(oModel, "ET_SH_REGION", urlParam);

			this.fSetSearchHelpValue(oModel, "ET_SH_COUNTRY");
			this.fSetSearchHelpValue(oModel, "ET_SH_TRABALHO_ESTRAG");
		},

		//	--------------------------------------------
		//	fSetSearchHelpValue
		//	--------------------------------------------		
		fSetSearchHelpValue: function (oModel, modelName, urlParam) {
			var that = this;

			function fSuccessExecutar(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
				that.getView().setModel(oValue, modelName);
			}

			function fErrorExecutar(oEvent) {
				console.log("An error occured while reading" + modelName + "!");
			}

			if (urlParam !== null & urlParam !== "" & urlParam !== undefined) {
				oModel.read(modelName, null, urlParam, false, fSuccessExecutar, fErrorExecutar);
			} else {
				oModel.read(modelName, null, null, true, fSuccessExecutar, fErrorExecutar);
			}
		},

		//--------------------------------------------
		//	fHelpRequest
		//--------------------------------------------		
		fHelpRequest: function (key, descriptionKey, cols, modelName, that, title, screenKeyField, screenTextField, onlyDesc, onlyKey) {
			var oScreenKeyField = that.getView().byId(screenKeyField);
			var oScreenTextField = that.getView().byId(screenTextField);

			that._oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				supportRanges: false,
				supportRangesOnly: false,
				supportMultiselect: false,
				key: key,
				descriptionKey: descriptionKey,

				ok: function (oEvent) {
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

					// that.getView().byId("btnSanity").setVisible(false);
					that.getView().byId("btnAccept").setEnabled(true);
					this.close();
				},
				cancel: function () {
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
		//	fReadModelFillDesc
		//	--------------------------------------------		
		fReadModelFillDesc: function (mockSubname, field, fieldTxt, keyColumnKey, keyColumnDesc) {
			//Get Model
			var oModelSH = sap.ui.getCore().getModel("MDL_SH");

			//Get values from view
			var oDataSH = oModelSH.getData();
			var fieldValue = this.getView().byId(field);
			var fieldDesc = this.getView().byId(fieldTxt);
			var valueExists = false;

			fieldDesc.setText("");

			//Verify if the inputed field value is valid
			for (var i = 0; i < oDataSH[mockSubname].length; i++) {
				if (fieldValue.getValue() === oDataSH[mockSubname][i][keyColumnKey]) {
					valueExists = true;
					break;
				}
			}

			//If so, fill the description with the corresponding value besides the key field. 
			//If not, clear description and indicates error to user
			if (valueExists === true) {
				fieldDesc.setText(oDataSH[mockSubname][i][keyColumnDesc] + " (" + oDataSH[mockSubname][i][keyColumnKey] + ")");
				this.fMessage("None", null, field);
			} else {

				if (fieldValue.getProperty("valueState") !== "Error") {
					this.fMessage("Error", "entrada_invalida", field);
				}
			}
		},

		//--------------------------------------------
		//	fUnableFields
		//--------------------------------------------	
		fUnableFields: function (closeButtons) {
			var oView = this.getView();

			oView.byId("ipRg").setEditable(false);
			oView.byId("ipPisPasep").setEditable(false);
			oView.byId("ipEmitterOrgan").setEditable(false);
			oView.byId("dpEmissionDate").setEditable(false);
			oView.byId("ipEmitterUF").setEditable(false);
			oView.byId("ipCtps").setEditable(false);
			oView.byId("ipCtpsSeries").setEditable(false);
			oView.byId("ipEmitterCtps").setEditable(false);
			oView.byId("dpEmissionDateCTPS").setEditable(false);
			oView.byId("ipRegionalCouncilNumber").setEditable(false);
			oView.byId("ipRegionalCouncilName").setEditable(false);
			oView.byId("ipRegionalCouncilInitials").setEditable(false);
			oView.byId("ipRegionalCouncilOrgao").setEditable(false);
			oView.byId("dpRegionalCouncilDtEmissao").setEditable(false);
			oView.byId("ipVoterTitleNumber").setEditable(false);
			oView.byId("ipVoterTitleZone").setEditable(false);
			oView.byId("ipElectoralSection").setEditable(false);
			oView.byId("ipForeignersIdentityCardNumber").setEditable(false);
			oView.byId("ipForeignersIdentityCardEmitterRNE").setEditable(false);
			oView.byId("ipVistaSerialNumber").setEditable(false);
			oView.byId("ipVistaType").setEditable(false);
			oView.byId("dpDateArrivalBrazil").setEditable(false);
			oView.byId("cbBrazilianPartner").setEditable(false);
			oView.byId("cbBrazilianChildren").setEditable(false);
			oView.byId("ipDriversLicenseNumber").setEditable(false);
			oView.byId("ipDriversLicenseOrgan").setEditable(false);
			oView.byId("ipDriversLicenseCategory").setEditable(false);
			oView.byId("dpDriversLicenseEmissionDate").setEditable(false);
			oView.byId("dpDriversLicenseDueDate").setEditable(false);
			oView.byId("slCondTrabEstrag").setEditable(false);
			oView.byId("dpPriHabilitacao").setEditable(false);
			oView.byId("ipPassportNumber").setEditable(false);
			oView.byId("dpPassportEmissionDate").setEditable(false);
			oView.byId("ipNitNumber").setEditable(false);
			oView.byId("dpNitmissionDate").setEditable(false);
			oView.byId("ipDirfsCountry").setEditable(false);
			oView.byId("taJust").setEditable(false);
			oView.byId("dpElectoralDtEmis").setEditable(false);
			oView.byId("ipElectoralEsEmis").setEditable(false);
			oView.byId("dpDtEmisVista").setEditable(false);
			if (closeButtons === true) {
				// oView.byId("btnSanity").setEnabled(false);
				oView.byId("btnSave").setEnabled(false);
				oView.byId("btnAccept").setEnabled(false);
				oView.byId("btnCancel").setEnabled(false);
			}

		},

		//	--------------------------------------------
		//	onHelpRequestEmitterUF
		//	--------------------------------------------		
		onHelpRequestEmitterUF: function () {
			var cols = [{
				label: "Código",
				template: "BLAND"
			}, {
				label: "Descrição",
				template: "BEZEI"
			}];

			this.fHelpRequest("BLAND", "BEZEI", cols, "ET_SH_REGION", this, "Estado",
				"ipEmitterUF", "ipEmitterUF", true, true);

			// this.getView().byId("btnSanity").setVisible(false);
		},

		//	--------------------------------------------
		//	onHelpRequestEmitterUF
		//	--------------------------------------------		
		onHelpRequestElectoralEsEmis: function () {
			var cols = [{
				label: "Código",
				template: "BLAND"
			}, {
				label: "Descrição",
				template: "BEZEI"
			}];

			this.fHelpRequest("BLAND", "BEZEI", cols, "ET_SH_REGION", this, "Estado",
				"ipElectoralEsEmis", "ipElectoralEsEmis", true, true);

			// this.getView().byId("btnSanity").setVisible(false);
		},

		//	--------------------------------------------
		//	onHelpRequestEmitterCtps
		//	--------------------------------------------		
		onHelpRequestEmitterCtps: function () {
			var cols = [{
				label: "Código",
				template: "BLAND"
			}, {
				label: "Descrição",
				template: "BEZEI"
			}];

			this.fHelpRequest("BLAND", "BEZEI", cols, "ET_SH_REGION", this, "Estado",
				"ipEmitterCtps", "ipEmitterCtps", true, true);

			// this.getView().byId("btnSanity").setVisible(false);
		},

		//	--------------------------------------------
		//	onHelpRequestDirfsCountry
		//	--------------------------------------------
		onHelpRequestDirfsCountry: function () {
			var cols = [{
				label: "Código",
				template: "LAND1"
			}, {
				label: "Descrição",
				template: "LANDX"
			}];

			this.fHelpRequest("LAND1", "LANDX", cols, "ET_SH_COUNTRY", this, "País",
				"ipDirfsCountry", "txtDirfsCountry", false, false);

			// this.getView().byId("btnSanity").setVisible(false);
		},

		//	--------------------------------------------
		//	fValidInputFields
		//	--------------------------------------------		
		fValidInputFields: function () {
			this.fObligatoryFields();

			var ipRg = this.fVerifyError("ipRg");
			var ipPisPasep = this.fVerifyError("ipPisPasep");
			var ipEmitterOrgan = this.fVerifyError("ipEmitterOrgan");

			//var dpEmissionDate = this.fVerifyError("dpEmissionDate");
			//var ipEmitterUF = this.fVerifyError("ipEmitterUF");

			//CR - 30.05 - CTPS Date is no longer obligatory
			//var ipCtps = this.fVerifyError("ipCtps");
			//var ipCtpsSeries = this.fVerifyError("ipCtpsSeries");
			//var ipEmitterCtps = this.fVerifyError("ipEmitterCtps");
			//var dpEmissionDateCTPS = this.fVerifyError("dpEmissionDateCTPS");
			var ipRegionalCouncilNumber = this.fVerifyError("ipRegionalCouncilNumber");
			var ipRegionalCouncilName = this.fVerifyError("ipRegionalCouncilName");
			var ipRegionalCouncilInitials = this.fVerifyError("ipRegionalCouncilInitials");
			var ipRegionalCouncilOrgao = this.fVerifyError("ipRegionalCouncilOrgao");
			var dpRegionalCouncilDtEmissao = this.fVerifyError("dpRegionalCouncilDtEmissao");
			var ipVoterTitleNumber = this.fVerifyError("ipVoterTitleNumber");
			var ipVoterTitleZone = this.fVerifyError("ipVoterTitleZone");
			var ipElectoralSection = this.fVerifyError("ipElectoralSection");
			var ipForeignersIdentityCardNumber = this.fVerifyError("ipForeignersIdentityCardNumber");
			var ipForeignersIdentityCardEmitterRNE = this.fVerifyError("ipForeignersIdentityCardEmitterRNE");
			var ipVistaSerialNumber = this.fVerifyError("ipVistaSerialNumber");
			var ipVistaType = this.fVerifyError("ipVistaType");
			var dpDateArrivalBrazil = this.fVerifyError("dpDateArrivalBrazil");
			var ipDriversLicenseNumber = this.fVerifyError("ipDriversLicenseNumber");
			var ipDriversLicenseOrgan = this.fVerifyError("ipDriversLicenseOrgan");
			var ipDriversLicenseCategory = this.fVerifyError("ipDriversLicenseCategory");
			var dpDriversLicenseEmissionDate = this.fVerifyError("dpDriversLicenseEmissionDate");
			var dpDriversLicenseDueDate = this.fVerifyError("dpDriversLicenseDueDate");
			var dpPriHabilitacao = this.fVerifyError("dpPriHabilitacao");
			var ipPassportNumber = this.fVerifyError("ipPassportNumber");
			var dpPassportEmissionDate = this.fVerifyError("dpPassportEmissionDate");
			var ipNitNumber = this.fVerifyError("ipNitNumber");
			var slCondTrabEstrag = this.fVerifyError("slCondTrabEstrag");
			var dpNitmissionDate = this.fVerifyError("dpNitmissionDate");
			var ipDirfsCountry = this.fVerifyError("ipDirfsCountry");
			var ipElectoralEsEmis = this.fVerifyError("ipElectoralEsEmis");
			var dpElectoralDtEmis = this.fVerifyError("dpElectoralDtEmis");
			var dpDtEmisVista = this.fVerifyError("dpDtEmisVista");

			if (ipRg === false && ipEmitterOrgan === false &&
				//ipCtps === false && ipCtpsSeries === false && ipEmitterCtps === false && //dpEmissionDateCTPS === false &&
				ipRegionalCouncilName === false && ipRegionalCouncilInitials === false && ipRegionalCouncilOrgao === false &&
				ipVoterTitleNumber === false && ipVoterTitleZone === false && ipRegionalCouncilNumber === false &&
				dpRegionalCouncilDtEmissao === false && ipElectoralSection === false && ipForeignersIdentityCardNumber === false &&
				ipForeignersIdentityCardEmitterRNE === false && ipVistaSerialNumber === false &&
				ipVistaType === false && dpDateArrivalBrazil === false && ipDriversLicenseNumber === false && dpDriversLicenseDueDate === false &&
				ipDriversLicenseOrgan === false && ipDriversLicenseCategory === false && dpPriHabilitacao === false &&
				dpDriversLicenseEmissionDate === false && ipPassportNumber === false && dpPassportEmissionDate === false &&
				ipNitNumber === false && dpNitmissionDate === false && ipDirfsCountry === false &&
				ipElectoralEsEmis === false && dpElectoralDtEmis === false && ipPisPasep === false && dpDtEmisVista === false) {
				return false;
			} else {
				return true;
			}
		},

		//	--------------------------------------------
		//	fObligatoryFields
		//	--------------------------------------------
		fObligatoryFields: function () {
			var oDocOrigModel = this.getView().getModel("ET_DOCUMENTS_ORIG");

			this.fValidationObligatoryFields("ipRg");

			this.fValidationObligatoryFields("ipEmitterOrgan");
			//this.fValidationObligatoryFields("dpEmissionDate");
			//this.fValidationObligatoryFields("ipEmitterUF");

			//CTPS and PIS are obligatory only if the employee is not an intern
			if (oDocOrigModel.APPRENTICE === "") {
				//CR - 30.05 - CTPS is no longer obligatory
				//this.fValidationObligatoryFields("ipCtps");
				//this.fValidationObligatoryFields("ipCtpsSeries");
				//this.fValidationObligatoryFields("ipEmitterCtps");
				//this.fValidationObligatoryFields("dpEmissionDateCTPS");
				this.fValidationObligatoryFields("ipPisPasep");
			}

			if (oDocOrigModel.OBLIGATORY_0004 !== "") {
				this.fValidationObligatoryFields("ipRegionalCouncilNumber");
				this.fValidationObligatoryFields("ipRegionalCouncilName");
				this.fValidationObligatoryFields("ipRegionalCouncilInitials");
				this.fValidationObligatoryFields("ipRegionalCouncilOrgao");
				this.fValidationObligatoryFields("dpRegionalCouncilDtEmissao");
			}

			if (oDocOrigModel.OBLIGATORY_0010 !== "") {
				this.fValidationObligatoryFields("ipDriversLicenseNumber");
				this.fValidationObligatoryFields("ipDriversLicenseOrgan");
				this.fValidationObligatoryFields("ipDriversLicenseCategory");
				this.fValidationObligatoryFields("dpDriversLicenseEmissionDate");
				this.fValidationObligatoryFields("dpDriversLicenseDueDate");
				this.fValidationObligatoryFields("dpPriHabilitacao");
			}

		},

		//	--------------------------------------------
		//	fVerifyFieldNotFilled
		//	--------------------------------------------
		fVerifyFieldNotFilled: function (field) {
			var oView = this.getView();
			var fieldState = oView.byId(field);

			if (fieldState.getProperty("valueState") === "Error" &
				fieldState.getProperty("valueStateText") === "Campo obrigatório") {

				this.fMessage("None", null, field);
			}

			if (oView.byId(field).getValue() === undefined ||
				oView.byId(field).getValue() === "" ||
				oView.byId(field).getValue() === " ") {

				return true;
			} else {
				return false;
			}
		},

		// --------------------------------------------
		// fActions
		// -------------------------------------------- 		
		fActions: function (that, actionText, action, req, newDt) {
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
				onClose: function (sButton) {
					if (sButton === MessageBox.Action.OK) {
						that.fCreateRequisition(that, action, req, newDt);
						return true;
					}
				}
			});
		},

		// --------------------------------------------
		// fCreateRequisition
		// -------------------------------------------- 
		fCreateRequisition: function (that, action, req, newDt) {
			var oCreate = {};
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			oCreate.BLOCK = {};

			oCreate.BLOCK.REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
			oCreate.IM_REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
			oCreate.IM_ACTION = action;
			oCreate.IM_LOGGED_IN = oGlobalData.IM_LOGGED_IN;
			oCreate.IM_PERNR = oGlobalData.IM_PERNR;
			oCreate.IM_BUKRS = oGlobalData.IM_BUKRS;
			oCreate.OBSERVATION = that.getView().byId("taJust").getValue();
			oCreate.BLOCK.COND_TRAB_0009 = that.getView().byId("slCondTrabEstrag").getSelectedKey();

			if (oCreate.IM_LOGGED_IN == 5) {
				oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
			}

			that.fFillCreateDocumentsData(oCreate, that, action, req, newDt);

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				that.obligatoryChanged = false;

				switch (action) {
				case "A":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
					that.fUnableApprovalButtons(that);
					that.fUnableAllButtons(that);
					that.fVerifyAction(false, "A");
					// *** ANEXO ***
					break;

				case "D":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " reprovada!");
					that.fUnableApprovalButtons(that);
					that.fVerifyAction(false, "D");
					// *** ANEXO ***
					break;

				case "S":
					that.fSucessMessageFromSendAction(oEvent);
					that.fVerifyAction(false, "S");
					// *** ANEXO ***
					that.saveAttachment(oGlobalData.IM_REQUISITION_ID, 'S');
					that.closeDmsDocument(oGlobalData.IM_REQUISITION_ID); 
					break;
				case "C":
					MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

					that.fGetBlock();
					var oUploadCollection = that.getView().byId("upldAttachments");
					oUploadCollection.destroyItems();
					that.fVerifyAction(false, "C");
					// *** ANEXO ***
					var oAtt = new JSONModel({table:[]});
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

					that.fSetGlobalInformation(oEvent, that);
					that.fVerifyAction();

					// *** ANEXO ***
					that.saveAttachment(oGlobalData.IM_REQUISITION_ID, 'G');

					break;
				}

				that.fGetLog();
			}

			//ERRO
			function fError(oEvent) {
				oGlobalData.IM_REQUISITION_ID = that.fGetRequisitionId(oEvent);

				if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
					var message = $(oEvent.response.body).find("message").first().text();

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
			oModel.create("ET_DOCUMENTS", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// fFillCreateDocumentsData
		// --------------------------------------------		
		fFillCreateDocumentsData: function (oCreate, that, action, req, newDt) {
			var oOriginalModel = that.getView().getModel("ET_DOCUMENTS_ORIG");
			var oActualModel = that.getView().getModel("ET_DOCUMENTS");
			var action = "INS";
			var actionDel = "DEL";
			var i;

			for (i in oActualModel.oData) {
				if (oActualModel.oData[i] == null || oActualModel.oData[i] == undefined) {
					oActualModel.oData[i] = "";
				}
			}

			for (i in oOriginalModel) {
				if (oOriginalModel[i] == null || oOriginalModel[i] == undefined) {
					oOriginalModel[i] = "";
				}
			}

			if (that.getView().byId("cbBrazilianPartner").getSelected() === true) {
				oActualModel.oData.MARRY_BR_0009 = "X";
			} else {
				oActualModel.oData.MARRY_BR_0009 = "";
			}

			if (that.getView().byId("cbBrazilianChildren").getSelected() === true) {
				oActualModel.oData.CHILDBR_0009 = "X";
			} else {
				oActualModel.oData.CHILDBR_0009 = "";
			}

			//Verify is exists any changes on the forms. Only send a requisition to create a new record, if any data of the 
			//block was changed
			//RG
			if (oOriginalModel.IDENT_NR_0002.trim() !== oActualModel.oData.IDENT_NR_0002.trim() ||
				oOriginalModel.DOC_ISSUER_0002.trim() !== oActualModel.oData.DOC_ISSUER_0002.trim() ||
				oOriginalModel.DT_EMIS_0002 !== oActualModel.oData.DT_EMIS_0002 ||
				oOriginalModel.ES_EMIS_0002.trim() !== oActualModel.oData.ES_EMIS_0002.trim()) {

				if (oActualModel.oData.IDENT_NR_0002.trim() == "" && oActualModel.oData.DOC_ISSUER_0002.trim() == "" &&
					(oActualModel.oData.DT_EMIS_0002 == null || oActualModel.oData.DT_EMIS_0002 == "") && oActualModel.oData.ES_EMIS_0002.trim() ==
					"") {

					if (oOriginalModel.ACTIO_0002 !== "") {
						oActualModel.oData.ACTIO_0002 = "";
					} else {
						oActualModel.oData.ACTIO_0002 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0002 = action;
				}

			}

			//CTPS
			if (oOriginalModel.CTPS_NR_0003.trim() !== oActualModel.oData.CTPS_NR_0003.trim() ||
				oOriginalModel.ES_EMIS_0003.trim() !== oActualModel.oData.ES_EMIS_0003.trim() ||
				oOriginalModel.DT_EMIS_0003 !== oActualModel.oData.DT_EMIS_0003 ||
				oOriginalModel.CTPS_SERIE_0003.trim() !== oActualModel.oData.CTPS_SERIE_0003.trim()) {

				if (oActualModel.oData.CTPS_NR_0003.trim() == "" && oActualModel.oData.ES_EMIS_0003.trim() == "" &&
					oActualModel.oData.CTPS_SERIE_0003.trim() == "" && (oActualModel.oData.DT_EMIS_0003 == null ||
						oActualModel.oData.DT_EMIS_0003 == "")) {

					if (oOriginalModel.ACTIO_0003 !== "") {
						oActualModel.oData.ACTIO_0003 = "";
					} else {
						oActualModel.oData.ACTIO_0003 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0003 = action;
				}
			}

			//CONSELHO REGIONAL
			if (oOriginalModel.CREG_INIT_0004.trim() !== oActualModel.oData.CREG_INIT_0004.trim() ||
				oOriginalModel.CREG_NAME_0004.trim() !== oActualModel.oData.CREG_NAME_0004.trim() ||
				oOriginalModel.DOC_ISSUER_0004.trim() !== oActualModel.oData.DOC_ISSUER_0004.trim() ||
				oOriginalModel.DT_EMIS_0004 !== oActualModel.oData.DT_EMIS_0004 ||
				oOriginalModel.CREG_NR_0004.trim() !== oActualModel.oData.CREG_NR_0004.trim()) {

				if (oActualModel.oData.CREG_INIT_0004.trim() == "" && oActualModel.oData.CREG_NAME_0004.trim() == "" &&
					oActualModel.oData.CREG_NR_0004.trim() == "" && oActualModel.oData.DOC_ISSUER_0004.trim() == "" &&
					(oActualModel.oData.DT_EMIS_0004 == null || oActualModel.oData.DT_EMIS_0004 == "")) {

					if (oOriginalModel.ACTIO_0004 !== "") {
						oActualModel.oData.ACTIO_0004 = "";
					} else {
						oActualModel.oData.ACTIO_0004 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0004 = action;
				}
			}

			//TÍTULO DE ELEITOR
			if (oOriginalModel.ELEC_NR_0005.trim() !== oActualModel.oData.ELEC_NR_0005.trim() ||
				oOriginalModel.ELEC_ZONE_0005.trim() !== oActualModel.oData.ELEC_ZONE_0005.trim() ||
				oOriginalModel.ELEC_SECT_0005.trim() !== oActualModel.oData.ELEC_SECT_0005.trim() ||
				oOriginalModel.DT_EMIS_0005 !== oActualModel.oData.DT_EMIS_0005 ||
				oOriginalModel.ES_EMIS_0005.trim() !== oActualModel.oData.ES_EMIS_0005.trim()) {

				if (oActualModel.oData.ELEC_NR_0005.trim() == "" && oActualModel.oData.ELEC_ZONE_0005.trim() == "" &&
					oActualModel.oData.ELEC_SECT_0005.trim() == "" && oActualModel.oData.ES_EMIS_0005.trim() == "") {

					if (oOriginalModel.ACTIO_0005 !== "") {
						oActualModel.oData.ACTIO_0005 = "";
					} else {
						oActualModel.oData.ACTIO_0005 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0005 = action;
				}
			}

			//CARTEIRA DE IDENTIDADE DE ESTRANGEIRO
			if (oOriginalModel.IDFOR_NR_0008.trim() !== oActualModel.oData.IDFOR_NR_0008.trim() ||
				oOriginalModel.DOC_ISSUER_0008.trim() !== oActualModel.oData.DOC_ISSUER_0008.trim()) {

				if (oActualModel.oData.IDFOR_NR_0008.trim() == "" && oActualModel.oData.DOC_ISSUER_0008.trim() == "") {

					if (oOriginalModel.ACTIO_0008 !== "") {
						oActualModel.oData.ACTIO_0008 = "";
					} else {
						oActualModel.oData.ACTIO_0008 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0008 = action;
				}
			}

			//VISTO DE ESTRANGEIRO
			if (oOriginalModel.VISA_NR_0009.trim() !== oActualModel.oData.VISA_NR_0009.trim() ||
				oOriginalModel.VISA_TYPE_0009.trim() !== oActualModel.oData.VISA_TYPE_0009.trim() ||
				oOriginalModel.DT_ARRV_0009 !== oActualModel.oData.DT_ARRV_0009 ||
				oOriginalModel.MARRY_BR_0009.trim() !== oActualModel.oData.MARRY_BR_0009.trim() ||
				oOriginalModel.CHILDBR_0009.trim() !== oActualModel.oData.CHILDBR_0009.trim() ||
				oOriginalModel.DT_EMIS_0009.trim() !== oActualModel.oData.DT_EMIS_0009.trim()) {

				if (oActualModel.oData.VISA_NR_0009.trim() == "" && oActualModel.oData.VISA_TYPE_0009.trim() == "" &&
					(oActualModel.oData.DT_ARRV_0009 == null || oActualModel.oData.DT_ARRV_0009 == "") &&
					oActualModel.oData.MARRY_BR_0009 == "" && oActualModel.oData.CHILDBR_0009 == "" &&
					(oActualModel.oData.DT_EMIS_0009 == null || oActualModel.oData.DT_EMIS_0009 == "")) {

					if (oOriginalModel.ACTIO_0009 !== "") {
						oActualModel.oData.ACTIO_0009 = "";
					} else {
						oActualModel.oData.ACTIO_0009 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0009 = action;
				}
			}

			//CARTEIRA DE HABILITAÇÃO
			if (oOriginalModel.DRIVE_NR_0010.trim() !== oActualModel.oData.DRIVE_NR_0010.trim() ||
				oOriginalModel.DOC_ISSUER_0010.trim() !== oActualModel.oData.DOC_ISSUER_0010.trim() ||
				oOriginalModel.DRIVE_CAT_0010.trim() !== oActualModel.oData.DRIVE_CAT_0010.trim() ||
				oOriginalModel.DT_EMIS_0010 !== oActualModel.oData.DT_EMIS_0010 ||
				oOriginalModel.PRIHABDAT_0010 !== oActualModel.oData.PRIHABDAT_0010 ||
				oOriginalModel.ENDDA_0010 !== oActualModel.oData.ENDDA_0010) {

				if (oActualModel.oData.DRIVE_NR_0010.trim() == "" && oActualModel.oData.DOC_ISSUER_0010.trim() == "" &&
					oActualModel.oData.DRIVE_CAT_0010.trim() == "" &&
					(oActualModel.oData.DT_EMIS_0010 == null || oActualModel.oData.DT_EMIS_0010 == "") &&
					(oActualModel.oData.PRIHABDAT_0010 == null || oActualModel.oData.PRIHABDAT_0010 == "") &&
					(oActualModel.oData.ENDDA_0010 == null || oActualModel.oData.ENDDA_0010 == "")) {

					if (oOriginalModel.ACTIO_0010 !== "") {
						oActualModel.oData.ACTIO_0010 = "";
					} else {
						oActualModel.oData.ACTIO_0010 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0010 = action;
				}
			}

			//PASSAPORTE
			if (oOriginalModel.PASSP_NR_0011.trim() !== oActualModel.oData.PASSP_NR_0011.trim() ||
				oOriginalModel.DT_EMIS_0011 !== oActualModel.oData.DT_EMIS_0011) {

				if (oActualModel.oData.PASSP_NR_0011.trim() == "" && (oActualModel.oData.DT_EMIS_0011 == null || oActualModel.oData.DT_EMIS_0011 ==
						"")) {

					if (oOriginalModel.ACTIO_0011 !== "") {
						oActualModel.oData.ACTIO_0011 = "";
					} else {
						oActualModel.oData.ACTIO_0011 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0011 = action;
				}
			}

			//NIT
			if (oOriginalModel.NIT_NR_9999.trim() !== oActualModel.oData.NIT_NR_9999.trim() ||
				oOriginalModel.DT_EMIS_9999 !== oActualModel.oData.DT_EMIS_9999 ||
				oOriginalModel.LAND1_9999.trim() !== oActualModel.oData.LAND1_9999.trim()) {

				if (oActualModel.oData.NIT_NR_9999.trim() == "" && (oActualModel.oData.DT_EMIS_9999 == null ||
						oActualModel.oData.DT_EMIS_9999 == "") && oActualModel.oData.LAND1_9999.trim() == "") {

					if (oOriginalModel.ACTIO_9999 !== "") {
						oActualModel.oData.ACTIO_9999 = "";
					} else {
						oActualModel.oData.ACTIO_9999 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_9999 = action;
				}
			}

			//PIS
			oCreate.BLOCK.PIS_NR_0006 = oActualModel.oData.PIS_NR_0006;
			if (oOriginalModel.PIS_NR_0006.trim() !== oActualModel.oData.PIS_NR_0006.trim()) {

				if (oActualModel.oData.PIS_NR_0006.trim() == "") {

					if (oOriginalModel.ACTIO_0006 !== "") {
						oActualModel.oData.ACTIO_0006 = "";
					} else {
						oActualModel.oData.ACTIO_0006 = actionDel;
					}

				} else {
					oActualModel.oData.ACTIO_0006 = action;
				}
			}
			oCreate.BLOCK.ACTIO_0006 = oActualModel.oData.ACTIO_0006;

			//FILL DATA TO SEND TO GATEWAY -> ECC

			oCreate.BLOCK.TYPE_SAVE = req;

			if (newDt !== "" && newDt !== undefined) {
				oCreate.BLOCK.SSG_DATE = newDt;
			} else {
				oCreate.BLOCK.SSG_DATE = null;
			}

			oCreate.BLOCK.CPF_NR = oActualModel.oData.CPF_NR;

			oCreate.BLOCK.IDENT_NR_0002 = oActualModel.oData.IDENT_NR_0002;
			oCreate.BLOCK.DOC_ISSUER_0002 = oActualModel.oData.DOC_ISSUER_0002;
			if (oActualModel.oData.DT_EMIS_0002 !== "" & oActualModel.oData.DT_EMIS_0002 !== " " & oActualModel.oData.DT_EMIS_0002 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0002 = oActualModel.oData.DT_EMIS_0002;
			}
			oCreate.BLOCK.ES_EMIS_0002 = oActualModel.oData.ES_EMIS_0002;
			oCreate.BLOCK.ACTIO_0002 = oActualModel.oData.ACTIO_0002;

			oCreate.BLOCK.CTPS_NR_0003 = oActualModel.oData.CTPS_NR_0003;
			oCreate.BLOCK.ES_EMIS_0003 = oActualModel.oData.ES_EMIS_0003;
			oCreate.BLOCK.CTPS_SERIE_0003 = oActualModel.oData.CTPS_SERIE_0003;

			if (oActualModel.oData.DT_EMIS_0003 !== "" & oActualModel.oData.DT_EMIS_0003 !== " " & oActualModel.oData.DT_EMIS_0003 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0003 = oActualModel.oData.DT_EMIS_0003;
			}

			oCreate.BLOCK.ACTIO_0003 = oActualModel.oData.ACTIO_0003;

			oCreate.BLOCK.CREG_INIT_0004 = oActualModel.oData.CREG_INIT_0004;
			oCreate.BLOCK.CREG_NAME_0004 = oActualModel.oData.CREG_NAME_0004;
			oCreate.BLOCK.CREG_NR_0004 = oActualModel.oData.CREG_NR_0004;
			oCreate.BLOCK.DOC_ISSUER_0004 = oActualModel.oData.DOC_ISSUER_0004;
			oCreate.BLOCK.ACTIO_0004 = oActualModel.oData.ACTIO_0004;

			if (oActualModel.oData.DT_EMIS_0004 !== "" & oActualModel.oData.DT_EMIS_0004 !== " " & oActualModel.oData.DT_EMIS_0004 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0004 = oActualModel.oData.DT_EMIS_0004;
			}

			oCreate.BLOCK.ELEC_NR_0005 = oActualModel.oData.ELEC_NR_0005;
			oCreate.BLOCK.ELEC_ZONE_0005 = oActualModel.oData.ELEC_ZONE_0005;
			oCreate.BLOCK.ELEC_SECT_0005 = oActualModel.oData.ELEC_SECT_0005;
			oCreate.BLOCK.ACTIO_0005 = oActualModel.oData.ACTIO_0005;
			oCreate.BLOCK.ES_EMIS_0005 = oActualModel.oData.ES_EMIS_0005;

			if (oActualModel.oData.DT_EMIS_0005 !== "" & oActualModel.oData.DT_EMIS_0005 !== " " & oActualModel.oData.DT_EMIS_0005 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0005 = oActualModel.oData.DT_EMIS_0005;
			}

			oCreate.BLOCK.IDFOR_NR_0008 = oActualModel.oData.IDFOR_NR_0008;
			oCreate.BLOCK.DOC_ISSUER_0008 = oActualModel.oData.DOC_ISSUER_0008;
			oCreate.BLOCK.ACTIO_0008 = oActualModel.oData.ACTIO_0008;

			oCreate.BLOCK.NATIO = oActualModel.oData.NATIO;
			oCreate.BLOCK.VISA_NR_0009 = oActualModel.oData.VISA_NR_0009;
			oCreate.BLOCK.VISA_TYPE_0009 = oActualModel.oData.VISA_TYPE_0009;
			oCreate.BLOCK.MARRY_BR_0009 = oActualModel.oData.MARRY_BR_0009;
			oCreate.BLOCK.COND_TRAB_0009 = oActualModel.oData.COND_TRAB_0009;
			oCreate.BLOCK.CHILDBR_0009 = oActualModel.oData.CHILDBR_0009;
			oCreate.BLOCK.ACTIO_0009 = oActualModel.oData.ACTIO_0009;
			if (oActualModel.oData.DT_EMIS_0009 !== "" & oActualModel.oData.DT_EMIS_0009 !== " " & oActualModel.oData.DT_EMIS_0009 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0009 = oActualModel.oData.DT_EMIS_0009;
			}

			if (oActualModel.oData.DT_ARRV_0009 !== "" & oActualModel.oData.DT_ARRV_0009 !== " " & oActualModel.oData.DT_ARRV_0009 !==
				undefined) {
				oCreate.BLOCK.DT_ARRV_0009 = oActualModel.oData.DT_ARRV_0009;
			}

			oCreate.BLOCK.DRIVE_NR_0010 = oActualModel.oData.DRIVE_NR_0010;
			oCreate.BLOCK.DOC_ISSUER_0010 = oActualModel.oData.DOC_ISSUER_0010;
			oCreate.BLOCK.DRIVE_CAT_0010 = oActualModel.oData.DRIVE_CAT_0010;
			oCreate.BLOCK.ACTIO_0010 = oActualModel.oData.ACTIO_0010;

			if (oActualModel.oData.DT_EMIS_0010 !== "" & oActualModel.oData.DT_EMIS_0010 !== " " & oActualModel.oData.DT_EMIS_0010 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0010 = oActualModel.oData.DT_EMIS_0010;
			}

			if (oActualModel.oData.PRIHABDAT_0010 !== "" & oActualModel.oData.PRIHABDAT_0010 !== " " & oActualModel.oData.PRIHABDAT_0010 !==
				undefined) {
				oCreate.BLOCK.PRIHABDAT_0010 = oActualModel.oData.PRIHABDAT_0010;
			}

			if (oActualModel.oData.ENDDA_0010 !== "" & oActualModel.oData.ENDDA_0010 !== " " & oActualModel.oData.ENDDA_0010 !==
				undefined) {
				oCreate.BLOCK.ENDDA_0010 = oActualModel.oData.ENDDA_0010;
			}

			oCreate.BLOCK.PASSP_NR_0011 = oActualModel.oData.PASSP_NR_0011;
			oCreate.BLOCK.ACTIO_0011 = oActualModel.oData.ACTIO_0011;

			if (oActualModel.oData.DT_EMIS_0011 !== "" & oActualModel.oData.DT_EMIS_0011 !== " " & oActualModel.oData.DT_EMIS_0011 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_0011 = oActualModel.oData.DT_EMIS_0011;
			}

			oCreate.BLOCK.NIT_NR_9999 = oActualModel.oData.NIT_NR_9999;
			oCreate.BLOCK.LAND1_9999 = oActualModel.oData.LAND1_9999;
			oCreate.BLOCK.ACTIO_9999 = oActualModel.oData.ACTIO_9999;

			if (oActualModel.oData.DT_EMIS_9999 !== "" & oActualModel.oData.DT_EMIS_9999 !== " " & oActualModel.oData.DT_EMIS_9999 !==
				undefined) {
				oCreate.BLOCK.DT_EMIS_9999 = oActualModel.oData.DT_EMIS_9999;
			}

			//User can save/cancel a requisition without inputting required data. However, DATE is only acceptable by gateway if it's null
			if (action === "R" || action === "C") {
				if (oCreate.BLOCK.DT_EMIS_0002 === "" || oCreate.BLOCK.DT_EMIS_0002 === " " || oCreate.BLOCK.DT_EMIS_0002 === undefined) {
					oCreate.BLOCK.DT_EMIS_0002 = null;
				}

				if (oCreate.BLOCK.DT_EMIS_0003 === "" || oCreate.BLOCK.DT_EMIS_0003 === " " || oCreate.BLOCK.DT_EMIS_0003 === undefined) {
					oCreate.BLOCK.DT_EMIS_0003 = null;
				}

				if (oCreate.BLOCK.DT_EMIS_0005 === "" || oCreate.BLOCK.DT_EMIS_0005 === " " || oCreate.BLOCK.DT_EMIS_0005 === undefined) {
					oCreate.BLOCK.DT_EMIS_0005 = null;
				}

				if (oCreate.BLOCK.DT_ARRV_0009 === "" || oCreate.BLOCK.DT_ARRV_0009 === " " || oCreate.BLOCK.DT_ARRV_0009 === undefined) {
					oCreate.BLOCK.DT_ARRV_0009 = null;
				}

				if (oCreate.BLOCK.DT_EMIS_0009 === "" || oCreate.BLOCK.DT_EMIS_0009 === " " || oCreate.BLOCK.DT_EMIS_0009 === undefined) {
					oCreate.BLOCK.DT_EMIS_0009 = null;
				}

				if (oCreate.BLOCK.DT_EMIS_0010 === "" || oCreate.BLOCK.DT_EMIS_0010 === " " || oCreate.BLOCK.DT_EMIS_0010 === undefined) {
					oCreate.BLOCK.DT_EMIS_0010 = null;
				}

				if (oCreate.BLOCK.PRIHABDAT_0010 === "" || oCreate.BLOCK.PRIHABDAT_0010 === " " || oCreate.BLOCK.PRIHABDAT_0010 === undefined) {
					oCreate.BLOCK.PRIHABDAT_0010 = null;
				}

				if (oCreate.BLOCK.ENDDA_0010 === "" || oCreate.BLOCK.ENDDA_0010 === " " || oCreate.BLOCK.ENDDA_0010 === undefined) {
					oCreate.BLOCK.ENDDA_0010 = null;
				}

				if (oCreate.BLOCK.DT_EMIS_0011 === "" || oCreate.BLOCK.DT_EMIS_0011 === " " || oCreate.BLOCK.DT_EMIS_0011 === undefined) {
					oCreate.BLOCK.DT_EMIS_0011 = null;
				}

				if (oCreate.BLOCK.DT_EMIS_9999 === "" || oCreate.BLOCK.DT_EMIS_9999 === " " || oCreate.BLOCK.DT_EMIS_9999 === undefined) {
					oCreate.BLOCK.DT_EMIS_9999 = null;
				}
			}

		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {
			var attachment = this.fValidAttachment();
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			if (this.fValidInputFields() === true) {
				this.handleErrorMessageBoxPress();
			} else if (!attachment) {
				this.handleErrorMessageAttachment();
		    } else { //if ((this.modelHasChanged === false || attachment === true && this.obligatoryChanged === false)) {

				MessageBox.confirm(
					message, {
						title: "Termo de responsabilidade",
						initialFocus: sap.m.MessageBox.Action.CANCEL,
						onClose: function (sButton) {
							if (sButton === MessageBox.Action.OK) {
								that.fActions(that, "envio", "S");
							}
						}
					});

			}
			/*else {
				this.handleErrorMessageBoxPress();
			}*/
		},

		// --------------------------------------------
		// onSanitation
		// --------------------------------------------  
		onSanitation: function () {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			if (this.fValidInputFields() === true) {
				this.handleErrorMessageBoxPress();
			} else {

				MessageBox.confirm(
					message, {
						title: "Termo de responsabilidade",
						initialFocus: sap.m.MessageBox.Action.CANCEL,
						onClose: function (sButton) {
							if (sButton === MessageBox.Action.OK) {
								that.fActions(that, "saneamento", "X");
								console.log('termo de responsabilidade');

								return true;
							}
						}
					});
			}
		},

		// --------------------------------------------
		// onSave 
		// --------------------------------------------  
		onSave: function () {
			var attachment = this.fValidAttachment();

			if (attachment === false) {
				this.handleErrorMessageAttachment();
				return;
			}
			this.fActions(this, "gravação", "R");
		},

		// --------------------------------------------
		// onApprove
		// -------------------------------------------- 

		onApprove: function () {
			var newDt;

			this.fActions(this, "Aprovação", "A", "M", newDt);
			// this._Dialog = sap.ui.xmlfragment("autoServico.view.TypeReq", this);

			// this._Dialog.open();
		},

		// onApprove: function() {
		// 	this.fActions(this, "Aprovação", "A");
		// },

		onSelect: function (oEvent) {

			var selecao = oEvent.getParameter('selectedIndex');
			if (selecao === 1) {
				sap.ui.getCore().byId("DataEfetiva").setVisible(true);
			} else if (selecao === 0) {
				sap.ui.getCore().byId("DataEfetiva").setVisible(false);
			}

		},

		handleChange: function () {
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

		onContinue: function (oEvent) {

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

		// --------------------------------------------
		// onReject
		// --------------------------------------------  
		onReject: function () {

			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Rejeição", "D");
			}

		},

		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function () {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Cancelamento", "C");
			}
		},

		fValidaCompany: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var company;
			oModel.read("/et_companySet", {
				async: false,
				success: function (oData, oResponse) {
					company = oData.results[0].company;
					if (company === 'ELEK') {
						that.getView().byId("dpElectoralDtEmis").setVisible(true); //elek
						that.getView().byId("ipElectoralEsEmis").setVisible(true); //elek
						that.getView().byId("dpDtEmisVista").setVisible(true); //elek
						that.getView().byId("ipRegionalCouncilEmis").setVisible(true); //elek
					} else {
						that.getView().byId("dpPriHabilitacao").setVisible(true);

					}
				},
				error: function (e) {
				}
			});
		},
		showDialogAnexo: function () {

			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (!oDialog) {
				oDialog = new Anexo(this.getView()); //Justificar ausencia

				this.mDialogs[sDialogName] = oDialog;

				// For navigation.
				oDialog.setRouter(this.oRouter);
			}

			oDialog.open(this.changedData, "104");
			//this.changedData = [];
		},
		saveAttachment: function (reqNumber, status) {
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
		fChangeScreen: function (that) {
			var screenType = that.getView().getModel("ET_GLOBAL_DATA").IM_LOGGED_IN;

			// Tela diferente de colaborador
			if (screenType != "0") {
				that.getView().byId("formCpf").setEditable(true);
				that.getView().byId("formRg").setEditable(true);
				that.getView().byId("formCtps").setEditable(true);
				that.getView().byId("formRegionalCouncil").setEditable(true);
				that.getView().byId("formVoterTitle").setEditable(true);
				that.getView().byId("formPisPasep").setEditable(true);
				that.getView().byId("formDriversLicense").setEditable(true);
				that.getView().byId("formPassport").setEditable(true);
				that.getView().byId("formForeignersIdentityCard").setEditable(true);
				that.getView().byId("formForeignVisa").setEditable(true);
				that.getView().byId("formNIF").setEditable(true);
				that.getView().byId("ipRg").setEditable(true);
				that.getView().byId("ipEmitterOrgan").setEditable(true);
				that.getView().byId("dpEmissionDate").setEditable(true);
				that.getView().byId("ipEmitterUF").setEditable(true);
				that.getView().byId("ipCtps").setEditable(true);
				that.getView().byId("ipCtpsSeries").setEditable(true);
				that.getView().byId("dpEmissionDateCTPS").setEditable(true);
				that.getView().byId("ipEmitterCtps").setEditable(true);
				that.getView().byId("ipRegionalCouncilNumber").setEditable(true);
				that.getView().byId("ipRegionalCouncilName").setEditable(true);
				that.getView().byId("ipRegionalCouncilInitials").setEditable(true);
				that.getView().byId("ipRegionalCouncilOrgao").setEditable(true);
				that.getView().byId("ipRegionalCouncilEmis").setEditable(true);
				that.getView().byId("dpRegionalCouncilDtEmissao").setEditable(true);
				that.getView().byId("ipVoterTitleNumber").setEditable(true);
				that.getView().byId("ipVoterTitleZone").setEditable(true);
				that.getView().byId("ipElectoralSection").setEditable(true);
				that.getView().byId("dpElectoralDtEmis").setEditable(true);
				that.getView().byId("ipElectoralEsEmis").setEditable(true);
				that.getView().byId("ipPisPasep").setEditable(true);
				that.getView().byId("ipDriversLicenseNumber").setEditable(true);
				that.getView().byId("ipDriversLicenseOrgan").setEditable(true);
				that.getView().byId("ipDriversLicenseCategory").setEditable(true);
				that.getView().byId("dpDriversLicenseEmissionDate").setEditable(true);
				that.getView().byId("dpDriversLicenseDueDate").setEditable(true);
				that.getView().byId("dpPriHabilitacao").setEditable(true);
				that.getView().byId("ipPassportNumber").setEditable(true);
				that.getView().byId("dpPassportEmissionDate").setEditable(true);
				that.getView().byId("ipForeignersIdentityCardNumber").setEditable(true);
				that.getView().byId("ipForeignersIdentityCardEmitterRNE").setEditable(true);
				that.getView().byId("ipVistaSerialNumber").setEditable(true);
				that.getView().byId("ipVistaType").setEditable(true);
				that.getView().byId("dpDateArrivalBrazil").setEditable(true);
				that.getView().byId("cbBrazilianPartner").setEditable(true);
				that.getView().byId("cbBrazilianChildren").setEditable(true);
				that.getView().byId("dpDtEmisVista").setEditable(true);
				that.getView().byId("slCondTrabEstrag").setEditable(true);
				that.getView().byId("ipNitNumber").setEditable(true);
				that.getView().byId("dpNitmissionDate").setEditable(true);
				that.getView().byId("ipDirfsCountry").setEditable(true);
				that.getView().byId("btnCancel").setVisible(true);
			}else{
				that.getView().byId("btnCancel").setVisible(false);
			}
		},
		getAttachment:function(){
			
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