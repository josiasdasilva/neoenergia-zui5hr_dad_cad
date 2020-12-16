sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"autoServico/view/BaseController",
	'sap/ui/model/Filter',
	'sap/ui/core/Fragment',
	"autoServico/formatter/Formatter",
	"autoServico/view/Anexo",
	"sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Filter, Fragment, Formatter, Anexo, JSONModel) {
	"use strict";

	return BaseController.extend("autoServico.view.DetailAddress", {

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

			//this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSearchHelps();
			this.fSetHeader();
			this.fSetGlobalInformation();
			this.initializeState();
			var that = this;
			this.getView().addEventDelegate({onBeforeShow: function(oEvent){that.initializeState(that)}}, this.getView());
			//this.initializeState();
		},

		initializeState: function (ref) {
			var sDialogName = 'Anexo';
			if(ref.mDialogs && ref.mDialogs[sDialogName] && ref.mDialogs[sDialogName] !== {}){
				ref.mDialogs[sDialogName].destroy();
				ref.mDialogs[sDialogName] = {};
			}
			ref.fGetBlock();
			ref.fValidaCompany();
			ref.getAttachment();
			ref.fClearValueStates();
		},
		//	--------------------------------------------
		//	onFieldLiveChange
		//	--------------------------------------------		
		onFieldLiveChange: function (oEvent) {
			var source;

			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);
			//this.fConvertToUppercase(fieldName);

			source = oEvent.getSource();
			var filterRule = source.data();
			if (filterRule instanceof Object) {
				filterRule = filterRule.liveChangeFilter;
				//console.log(filterRule);
				if (filterRule) {
					switch (filterRule) {
					case "phoneRule":
						var inputValue = source.getValue();
						//inputValue = inputValue.trim()   // Corta espaços no final - Retirado a pedido do Clima
						inputValue = inputValue.replace(/\({2,}/g, '(');
						inputValue = inputValue.replace(/\){2,}/g, ')');
						inputValue = inputValue.replace(/\-{2,}/g, '-');
						inputValue = inputValue.replace(/[^\(,\),\-,0-9,\s]/g, '');
						if (inputValue.length < 10) {
							this.fMessage("Error", "telefone_invalido", fieldName);
						} else {
							this.fMessage("None", "", fieldName);
						}

						var field = this.getView().byId(fieldName);
						var focusInfo = field.getFocusInfo();
						source.setValue(inputValue);
						field.applyFocusInfo(focusInfo);
						break;

					case "uppercase":
						this.fConvertToUppercase(fieldName);
						break;
					}
				}
			}

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
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

				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
				oValue.oData.COM01 = "CELL";
				oValue.oData.COM02 = "TEL1";
				oValue.oData.COM03 = "TEL2";
				that.getView().setModel(oValue, "ET_ADDRESS");
				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);

				// se tem id verificar os anexos
				// if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {

				// 	var filters = [];

				// 	filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];

				// 	that.getView().setModel(oModel, "anexo");

				// 	// Update list binding
				// 	that.getView().byId("upldAttachments").getBinding("items").filter(filters);

				// }

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
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find('message').first().text();

				if (message.substring(2, 4) == "99") {
					var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
					var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
					var zMessage = formattedDetail.replace("error", "");

					that.fVerifyAllowedUser(message, that);
					MessageBox.error(zMessage);

				} else {
					MessageBox.error(message);
				}

				// that.getView().byId("btnSanity").setVisible(false);
			}

			oModel.read("ET_ADDRESS" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	onFieldChange
		//	--------------------------------------------		
		onFieldChange: function (oEvent) {
			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);

			if (this.getView().byId(fieldName).getRequired() === true) {
				this.fValidationObligatoryFields(fieldName);
			}

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},

		//	--------------------------------------------
		//	onFieldChangePostalCode
		//	--------------------------------------------		
		onFieldChangePostalCode: function () {
			// this.getView().byId("btnSanity").setVisible(false);

			var postalCode = this.getView().byId("ipPostalCode").getValue();
			var oView = this.getView();
			var that = this;

			function fAttributes(attribute) {
				oView.byId("ipStreet").setEditable(attribute);
				oView.byId("ipNeighborhood").setEditable(attribute);
				oView.byId("ipCountry").setEditable(attribute);
				oView.byId("ipRegion").setEditable(attribute);
				oView.byId("ipCity").setEditable(attribute);
			}

			function fSearchPostalCode(that) {
				var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

				function fSuccess(oEvent) {

					var oAddressData = oView.getModel("ET_ADDRESS");

					if (oEvent.cep != '') {
						oAddressData.STRAS = oEvent.TIPO_LOGRADOURO + " " + oEvent.LOGRADOURO;
						oAddressData.ORT02 = oEvent.BAIRRO;
						oAddressData.PSTLZ = oEvent.CEP;
						oAddressData.LAND1 = "BR";
						oAddressData.STATE = oEvent.UF;
						oAddressData.ORT01 = oEvent.CIDADE;

						oView.byId("ipStreet").setValue(oAddressData.STRAS);
						oView.byId("ipNeighborhood").setValue(oAddressData.ORT02);
						oView.byId("ipPostalCode").setValue(oAddressData.PSTLZ);
						oView.byId("ipCountry").setValue(oAddressData.LAND1);
						oView.byId("ipRegion").setValue(oAddressData.STATE);
						oView.byId("ipCity").setValue(oAddressData.ORT01);
						oView.byId("ipStreetNum").setValue("");
						oView.byId("ipStreetComp").setValue("");
						oView.byId("ipStreetCompE").setValue("");

						fAttributes(false);

						if (oEvent.BAIRRO == "" || oEvent.BAIRRO == undefined) {
							oView.byId("ipNeighborhood").setEnabled(true);
							oView.byId("ipNeighborhood").setEditable(true);
							oView.byId("ipNeighborhood").setValue("");
						}

						if (oEvent.LOGRADOURO == "" || oEvent.LOGRADOURO == undefined) {
							oView.byId("ipStreet").setEnabled(true);
							oView.byId("ipStreet").setEditable(true);
							oView.byId("ipStreet").setValue("");
						}

					} else {
						MessageBox.error("CEP não encontrado");
						that.fMessage("Error", "entrada_invalida", "ipPostalCode");
						fAttributes(false);

						oView.byId("ipStreet").setValue("");
						oView.byId("ipNeighborhood").setValue("");
						oView.byId("ipCountry").setValue("");
						oView.byId("ipRegion").setValue("");
						oView.byId("ipCity").setValue("");
						oView.byId("ipStreetNum").setValue("");
						oView.byId("ipStreetComp").setValue("");
						oView.byId("ipStreetCompE").setValue("");
					}
				}

				function fError(oEvent) {
					MessageBox.error("CEP não encontrado");
					that.fMessage("Error", "entrada_invalida", "ipPostalCode");
					fAttributes(false);

					oView.byId("ipStreet").setValue("");
					oView.byId("ipNeighborhood").setValue("");
					oView.byId("ipCountry").setValue("");
					oView.byId("ipRegion").setValue("");
					oView.byId("ipCity").setValue("");
					oView.byId("ipStreetNum").setValue("");
					oView.byId("ipStreetComp").setValue("");
					oView.byId("ipStreetCompE").setValue("");
				}

				var ipCEP = oView.byId("ipPostalCode").getValue();
				// ipCEP = ipCEP.replace('-', '');
				var urlParam = '(' + "'" + ipCEP + "')";
				oModel.read("ET_CEP" + urlParam, null, null, false, fSuccess, fError);

			}

			//MAIN LOGIC
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
			// this.getView().byId("btnSanity").setVisible(false);

			/*			if (this.fValidationObligatoryFields("ipPostalCode") !== true) {*/
			if (postalCode.match(/^[0-9-]+$/) === null || postalCode.length < 8) {
				this.fMessage("Error", "entrada_invalida", "ipPostalCode");
			} else {
				this.fMessage("None", null, "ipPostalCode");
				fSearchPostalCode(that);
			}
			/*		} else {
						this.fMessage("None", null, "ipPostalCode");
						//fAttributes(false);
					}*/
		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");

			this.fSetSearchHelpValue(oModel, "ET_SH_COUNTRY");
			this.fSetSearchHelpValue(oModel, "ET_SH_COMMUNICATION");
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
				oModel.read(modelName, null, null, false, fSuccessExecutar, fErrorExecutar);
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

			var oFilterBar = new sap.ui.comp.filterbar.FilterBar({
				advancedMode: false,
				filterBarExpanded: true,
				showFilterConfiguration: false,
				showClearButton: false,
				showRestoreButton: false,

				showGoOnFB: !sap.ui.Device.system.phone,
				filterGroupItems: [new sap.ui.comp.filterbar.FilterGroupItem({
						groupTitle: "foo",
						groupName: "gn1",
						name: "n1",
						label: "Company Code",
						control: new sap.m.Input()
					}),
					new sap.ui.comp.filterbar.FilterGroupItem({
						groupTitle: "foo",
						groupName: "gn1",
						name: "n2",
						label: "Company Name",
						control: new sap.m.Input()
					}),
					new sap.ui.comp.filterbar.FilterGroupItem({
						groupTitle: "foo",
						groupName: "gn1",
						name: "n3",
						label: "City",
						control: new sap.m.Input()
					}),
					new sap.ui.comp.filterbar.FilterGroupItem({
						groupTitle: "foo",
						groupName: "gn1",
						name: "n4",
						label: "Currency Code",
						control: new sap.m.Input()
					})
				],
				search: function () {
					var x = that.getView().byId("__bar2");
					sap.m.MessageToast.show("Search pressed '" + arguments[0].mParameters.selectionSet[0].getValue() + "''");
				}
			});

			if (oFilterBar.setBasicSearch) {
				oFilterBar.setBasicSearch(new sap.m.SearchField({
					showSearchButton: sap.ui.Device.system.phone,
					placeholder: "Digite o País",
					search: function (event) {
						that._oValueHelpDialog.getFilterBar().search();
					}
				}));
			}

			that._oValueHelpDialog.setFilterBar(oFilterBar);

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

			this._oValueHelpDialog.update();
		},

		//--------------------------------------------
		//	onHelpRequestRegion
		//--------------------------------------------		
		onHelpRequestRegion: function () {
			var cols = [{
				label: "Código",
				template: "BLAND"
			}, {
				label: "Descrição",
				template: "BEZEI"
			}];

			this.fSearchHelpRegion();

			this.fHelpRequest("BLAND", "BEZEI", cols, "ET_SH_REGION", this, "Região",
				"ipRegion", "txtRegion", false, false);
		},

		//	--------------------------------------------
		//	fSearchHelpRegion
		//	--------------------------------------------
		fSearchHelpRegion: function () {
			var urlParam = "";
			var ipCountry = this.getView().byId("ipCountry").getValue();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");

			if (ipCountry !== "" & ipCountry !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_COUNTRY", ipCountry);
			}

			this.fSetSearchHelpValue(oModel, "ET_SH_REGION", urlParam);
		},

		//--------------------------------------------
		//	onHelpRequestCity
		//--------------------------------------------		
		onHelpRequestCity: function (oEvent) {
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

			this.fSearchHelpCity();

			this.fHelpRequest("", "TEXT", cols, "ET_SH_LOCAL_OF_BIRTH", this, "Nome do Município",
				oEvent.getParameter("id").substring(12), oEvent.getParameter("id").substring(12), true, false);
		},

		//	--------------------------------------------
		//	fSearchHelpCity
		//	--------------------------------------------
		fSearchHelpCity: function () {
			var urlParam = "";
			var ipCountry = this.getView().byId("ipCountry").getValue();
			var ipRegion = this.getView().byId("ipRegion").getValue();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");

			if (ipCountry !== "" & ipCountry !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_COUNTRY", ipCountry);
			}

			if (ipRegion !== "" & ipRegion !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_REGION", ipRegion, urlParam);
			}

			this.fSetSearchHelpValue(oModel, "ET_SH_LOCAL_OF_BIRTH", urlParam);
		},

		//--------------------------------------------
		//	onHelpRequestCountry
		//--------------------------------------------		
		onHelpRequestCountry: function (oEvent) {
			var cols = [{
				label: "Código",
				template: "LAND1"
			}, {
				label: "Descrição",
				template: "LANDX"
			}];

			this.fHelpRequest("LAND1", "LANDX", cols, "ET_SH_COUNTRY", this, "País",
				oEvent.getParameter("id").substring(12), "txt" + oEvent.getParameter("id").substring(14), false, false);
		},

		//--------------------------------------------
		//	onHelpRequestTypeTel
		//--------------------------------------------		
		onHelpRequestTypeTel: function (oEvent) {
			var cols = [{
				label: "Código",
				template: "COMTY"
			}, {
				label: "Descrição",
				template: "COMKY"
			}];

			this.fHelpRequest("", "COMKY", cols, "ET_SH_COMMUNICATION", this, "Tipo de Comunicação",
				oEvent.getParameter("id").substring(12), oEvent.getParameter("id").substring(12), true, false);
		},

		// --------------------------------------------
		// fValidInputFields
		// -------------------------------------------- 		
		fValidInputFields: function () {
			this.fObligatoryFields();

			var ipStreet = this.fVerifyError("ipStreet");
			var ipStreetNum = this.fVerifyError("ipStreetNum");
			var ipNeighborhood = this.fVerifyError("ipNeighborhood");
			var ipCity = this.fVerifyError("ipCity");
			var ipPostalCode = this.fVerifyError("ipPostalCode");
			var ipCountry = this.fVerifyError("ipCountry");
			var ipRegion = this.fVerifyError("ipRegion");

			var ipStreetComp = this.fVerifyError("ipStreetComp");

			//var ipTypeTel1 = this.fVerifyError("ipTypeTel1");
			var ipTel1 = this.fVerifyError("ipTel1");
			//var ipTypeTel2 = this.fVerifyError("ipTypeTel2");
			//var ipTel2 = this.fVerifyError("ipTel2");
			//var ipTypeTel3 = this.fVerifyError("ipTypeTel3");
			//var ipTel3 = this.fVerifyError("ipTel3");

			/*			if (ipStreet === false & ipStreetNum === false & ipNeighborhood === false &
							ipCity === false & ipPostalCode === false & ipCountry === false &
							ipRegion === false & ipTypeTel1 === false & ipTel1 === false &
							ipTypeTel2 === false & ipTel2 === false & ipTypeTel3 === false &
							ipTel3 === false) {

							return false;
						} else {
							return true;
						}*/

			if (ipStreet === false && ipStreetNum === false && ipNeighborhood === false &&
				ipCity === false && ipPostalCode === false && ipCountry === false &&
				ipRegion === false && ipTel1 === false && ipStreetComp === false) {

				return false;
			} else {
				return true;
			}

		},

		// --------------------------------------------
		// fObligatoryFields
		// --------------------------------------------  		
		fObligatoryFields: function () {
			this.fValidationObligatoryFields("ipStreet");
			this.fValidationObligatoryFields("ipStreetNum");
			this.fValidationObligatoryFields("ipNeighborhood");
			this.fValidationObligatoryFields("ipCity");
			this.fValidationObligatoryFields("ipPostalCode");
			this.fValidationObligatoryFields("ipCountry");
			this.fValidationObligatoryFields("ipRegion");

			this.fValidationObligatoryFieldsContactPhones();
		},

		// --------------------------------------------
		// fObligatoryFieldsContactPhones
		// --------------------------------------------		
		fValidationObligatoryFieldsContactPhones: function () {

			if (this.fVerifyFieldNotFilled("ipTel1") === true && this.fVerifyFieldNotFilled("ipTel2") === true &&
				this.fVerifyFieldNotFilled("ipTel3") === true) {

				this.fValidationObligatoryFields("ipTel1");
			}

		},

		fVerifyPhoneFields: function (fields) {
			var oView;

			alert('VerifyPhoneFields');
			if (typeof fields === 'string') {
				fields = [fields];
			}

			if (!(fields instanceof Array)) {
				return;
			}

			oView = this.getView();
			fields.forEach(function (item) {
				alert('Check field [' + item + '] :=> [' + oView.byId(item).getValue() + ']');
			});

			return;
		},
		/*
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
			
		}, */

		//	--------------------------------------------
		//	fVerifyFieldNotFilled
		//	--------------------------------------------
		fVerifyFieldNotFilled: function (field) {
			var oView = this.getView();
			var fieldState = oView.byId(field);
			var value;

			if ((fieldState.getProperty("valueState") === "Error") && (fieldState.getProperty("valueStateText") === "Campo obrigatório")) {
				alert('None')
				this.fMessage("None", null, field);
			}

			value = oView.byId(field).getValue();
			if ((value === undefined) || (value === "") || (value === " ")) {
				return true;
			} else {
				return false;
			}
		},

		// --------------------------------------------
		// fUnableFields
		// --------------------------------------------  		
		fUnableFields: function (closeButtons) {
			var oView = this.getView();

			oView.byId("ipStreet").setEditable(false);
			oView.byId("ipStreetNum").setEditable(false);
			oView.byId("ipStreetComp").setEditable(false);
			oView.byId("ipStreetCompE").setEditable(false);
			oView.byId("ipNeighborhood").setEditable(false);
			oView.byId("ipCity").setEditable(false);
			oView.byId("ipPostalCode").setEditable(false);
			oView.byId("ipCountry").setEditable(false);
			oView.byId("ipRegion").setEditable(false);
			// oView.byId("ipTypeTel1").setEditable(false);
			oView.byId("ipTel1").setEditable(false);
			// oView.byId("ipTypeTel2").setEditable(false);
			// oView.byId("ipTel2").setEditable(false);
			// oView.byId("ipTypeTel3").setEditable(false);
			// oView.byId("ipTel3").setEditable(false);
			oView.byId("ipRamal").setEditable(false);
			oView.byId("ipEmail").setEditable(false);
			// oView.byId("ipStreetForeign").setEditable(false);
			// oView.byId("ipStreetNumForeign").setEditable(false);
			// oView.byId("ipStreetCompForeign").setEditable(false);
			// oView.byId("ipNeighborhoodForeign").setEditable(false);
			// oView.byId("ipForeignCity").setEditable(false);
			// oView.byId("ipPostalCodeForeign").setEditable(false);
			// oView.byId("ipResidenceCountry").setEditable(false);
			oView.byId("taJust").setEditable(false);

			if (closeButtons === true) {
				// oView.byId("btnSanity").setEnabled(false);
				oView.byId("btnSave").setEnabled(false);
				oView.byId("btnAccept").setEnabled(false);
				oView.byId("btnCancel").setEnabled(false);
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

			that.fFillCreateAdressData(oCreate, that, req, newDt);

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
				case "A":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
					that.fUnableApprovalButtons(that);
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

					//var oUploadCollection = that.getView().byId("upldAttachments");
					//oUploadCollection.destroyItems();

					that.fGetBlock();
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
					//that.doValidate(function() { alert('gravação'); });
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
			oModel.create("ET_ADDRESS", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// fFillCreateAdressData
		// --------------------------------------------
		fFillCreateAdressData: function (oCreate, that, req, newDt) {

			oCreate.BLOCK.STRAS = that.getView().byId("ipStreet").getValue();
			oCreate.BLOCK.HSNMR = that.getView().byId("ipStreetNum").getValue();
			oCreate.BLOCK.LOCAT = that.getView().byId("ipStreetComp").getValue();
			oCreate.BLOCK.POSTA = that.getView().byId("ipStreetCompE").getValue();
			oCreate.BLOCK.ORT02 = that.getView().byId("ipNeighborhood").getValue();
			oCreate.BLOCK.ORT01 = that.getView().byId("ipCity").getValue();
			oCreate.BLOCK.PSTLZ = that.getView().byId("ipPostalCode").getValue();
			oCreate.BLOCK.LAND1 = that.getView().byId("ipCountry").getValue();
			oCreate.BLOCK.STATE = that.getView().byId("ipRegion").getValue();
			//oCreate.BLOCK.COM01 = that.getView().byId("ipTypeTel1").getValue();
			oCreate.BLOCK.COM01 = "CELL";
			oCreate.BLOCK.NUM01 = that.getView().byId("ipTel1").getValue();
			oCreate.BLOCK.TEL_EXTENS = that.getView().byId("ipRamal").getValue();
			oCreate.BLOCK.EMAIL = that.getView().byId("ipEmail").getValue();
			// // oCreate.BLOCK.COM02 = that.getView().byId("ipTypeTel2").getValue();
			oCreate.BLOCK.COM02 = "TEL1";
			oCreate.BLOCK.NUM02 = that.getView().byId("ipTel2").getValue();
			// //oCreate.BLOCK.COM03 = that.getView().byId("ipTypeTel3").getValue();
			oCreate.BLOCK.COM03 = "TEL2";
			oCreate.BLOCK.NUM03 = that.getView().byId("ipTel3").getValue();

			// oCreate.BLOCK.EX_HSNMR = that.getView().byId("ipStreetNumForeign").getValue();
			// oCreate.BLOCK.EX_LAND1 = that.getView().byId("ipResidenceCountry").getValue();
			// oCreate.BLOCK.EX_ORT01 = that.getView().byId("ipForeignCity").getValue();
			// oCreate.BLOCK.EX_ORT02 = that.getView().byId("ipNeighborhoodForeign").getValue();
			// oCreate.BLOCK.EX_POSTA = that.getView().byId("ipStreetCompForeign").getValue();
			// oCreate.BLOCK.EX_PSTLZ = that.getView().byId("ipPostalCodeForeign").getValue();
			// oCreate.BLOCK.EX_STRAS = that.getView().byId("ipStreetForeign").getValue();

			oCreate.BLOCK.TYPE_SAVE = req;

			if (newDt !== "" && newDt !== undefined) {
				oCreate.BLOCK.SSG_DATE = newDt;
			} else {
				oCreate.BLOCK.SSG_DATE = null;
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
		// onSend
		// --------------------------------------------  
		onSend: function () {

			var attachment = this.fValidAttachment();

			if (!attachment) {
				this.handleErrorMessageAttachment();
				return;
			}

			this.doValidate(function (that) {
				that.fActions(that, "envio", "S");
			});
		},

		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function () {
			this.fActions(this, "Cancelamento", "C");
		},

		// --------------------------------------------
		// onApprove
		// -------------------------------------------- 		
		// onApprove: function() {
		// 	this.fActions(this, "Aprovação", "A");
		// },

		onApprove: function () {
			var newDt;

			this.fActions(this, "Aprovação", "A", "M", newDt);

			// this._Dialog = sap.ui.xmlfragment("autoServico.view.TypeReq", this);

			// this._Dialog.open();
		},

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
			this.fActions(this, "Rejeição", "D");
		},

		// --------------------------------------------
		// onSanitation
		// --------------------------------------------  
		onSanitation: function () {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			if (this.checkCEPUpdate()) {
				return;
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

		doValidate: function (action) {
			//var attachment = this.fValidAttachment();
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			if (this.fValidInputFields() === true) {
				this.handleErrorMessageBoxPress();
				//	} else if (attachment === false && this.modelHasChanged === true) {
				//		this.handleErrorMessageAttachment();
				//} else if (this.modelHasChanged === false || attachment === true) {
			} else if (this.modelHasChanged === false) {
				MessageBox.confirm(
					message, {
						title: "Termo de responsabilidade",
						initialFocus: sap.m.MessageBox.Action.CANCEL,
						onClose: (function (sButton) {
							if (sButton === MessageBox.Action.OK) {
								action(that);
								return true;
							};
						})
					});
			} else {
				this.handleErrorMessageBoxPress();
			}
		},

		checkCEPUpdate: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var that = this;
			var boolean = false;

			function fSuccess(oEvent) {
				var oAddressData = that.getView().getModel("ET_ADDRESS");
				var Address = {};
				if (oEvent.cep != '') {

					if (oEvent.TIPO_LOGRADOURO.trim() == '' && oEvent.LOGRADOURO.trim() == '' && oEvent.BAIRRO.trim() == '' &&
						oAddressData.oData.STRAS.trim() != '' && oAddressData.oData.ORT02.trim() != '') {
						return;
					}

					Address.STRAS = oEvent.TIPO_LOGRADOURO + " " + oEvent.LOGRADOURO;
					Address.ORT02 = oEvent.BAIRRO;
					Address.PSTLZ = oEvent.CEP;
					Address.LAND1 = "BR";
					Address.STATE = oEvent.UF;
					Address.ORT01 = oEvent.CIDADE;

					if (Address.STRAS != oAddressData.oData.STRAS || Address.ORT02 != oAddressData.oData.ORT02 ||
						Address.PSTLZ != oAddressData.oData.PSTLZ.replace('-', '') || Address.LAND1 != oAddressData.oData.LAND1 ||
						Address.STATE != oAddressData.oData.STATE || Address.ORT01 != oAddressData.oData.ORT01) {

						that.getView().byId("ipStreet").setValue(Address.STRAS);
						that.getView().byId("ipNeighborhood").setValue(Address.ORT02);
						that.getView().byId("ipPostalCode").setValue(Address.PSTLZ);
						that.getView().byId("ipCountry").setValue(Address.LAND1);
						that.getView().byId("ipRegion").setValue(Address.STATE);
						that.getView().byId("ipCity").setValue(Address.ORT01);
						// that.getView().byId("btnSanity").setVisible(false);
						that.getView().byId("btnAccept").setEnabled(true);

						MessageBox.warning(
							"Seu endereço foi atualizado de acordo com o cadastro de seu CEP nos correios, favor clicar em “Enviar” para realizar a atualização e finalizar o saneamento de dados."
						);

						boolean = true;
					}

				} else {
					MessageBox.error("CEP não encontrado");
					that.getView().fMessage("Error", "entrada_invalida", "ipPostalCode");

					boolean = true;
				}

			}

			function fError(oEvent) {
				MessageBox.error("CEP não encontrado");
				that.getView().fMessage("Error", "entrada_invalida", "ipPostalCode");
				boolean = true;
			}

			var ipCEP = this.getView().byId("ipPostalCode").getValue();
			ipCEP = ipCEP.replace('-', '');
			var urlParam = '(' + "'" + ipCEP + "')";
			oModel.read("ET_CEP" + urlParam, null, null, false, fSuccess, fError);

			return boolean;

		},
		// --------------------------------------------
		// onPress
		// -------------------------------------------- 
		onPress: function (oEvent) {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var oQuickViewModelText;

			oQuickViewModelText = new sap.ui.model.json.JSONModel({
				text: oBundle.getText("texto_explicativo_cep"),
				header: oBundle.getText("cep")
			});

			sap.ui.getCore().setModel(oQuickViewModelText, "ET_QUICK_VIEW_TEXT");

			this._Dialog = sap.ui.xmlfragment("autoServico.view.QuickView", this);
			this._Dialog.open();
		},

		// --------------------------------------------
		// onPressHelpAddress
		// -------------------------------------------- 
		onPressHelpAddress: function () {
			this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpAddress", this);

			this._Dialog.open();
		},

		// --------------------------------------------
		// onClose
		// -------------------------------------------- 
		onClose: function () {
			this._Dialog.close();
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
						// that.getView().byId("ipTypeTel1").setVisible(true);
						// that.getView().byId("ipTypeTel2").setVisible(true);
						// that.getView().byId("ipTypeTel3").setVisible(true);
						that.getView().byId("ipTel2").setVisible(true);
						that.getView().byId("ipTel3").setVisible(true);
						that.getView().byId("ipStreetCompE").setVisible(true);
					} else {
						// that.getView().byId("ipRamal").setVisible(true);
						that.getView().byId("ipStreetComp").setVisible(true);
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

			oDialog.open(this.changedData, "105");
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
		getAttachment: function () {

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