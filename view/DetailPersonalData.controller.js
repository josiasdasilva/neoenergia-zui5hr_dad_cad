sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	'sap/m/MessageToast',
	"autoServico/view/BaseController",
	'sap/ui/model/Filter',
	'sap/ui/core/Fragment',
	"autoServico/formatter/Formatter",
	"sap/ui/model/json/JSONModel",
	"sap/m/Dialog",
	"sap/m/UploadCollectionParameter",
	"autoServico/view/Anexo",
], function (Controller, ResourceModel, MessageBox, MessageToast, BaseController, Filter, Fragment, Formatter, JSONModel,Dialog, UploadCollectionParameter, Anexo) {
	"use strict";
	
	return BaseController.extend("autoServico.view.DetailPersonalData", {
		
		onInit: function () {
			this.changedData = [];
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();
			
			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				var oEventBus = this.getEventBus();
			}
			
			var oAtt = new JSONModel({table:[]});
			this.getView().setModel(oAtt, "Attachments");
			
			this.obligatoryChanged = false;
			
			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSetHeader();
			this.fSetGlobalInformation();
			this.fSearchHelps();
			//this.fGetBlock();
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
			ref.getAttachment();
			ref.fClearValueStates();
		},
		onChange:function(){
		},
		showDialogAnexo: function (){
			
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];
			
			if (!oDialog) {
				oDialog = new Anexo(this.getView());
				this.mDialogs[sDialogName] = oDialog;
				// For navigation.
				oDialog.setRouter(this.oRouter);
			}
			
			oDialog.open(this.changedData, '102');
			//this.changedData = [];
		},
		saveAttachment: function(reqNumber, status){
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
		//	--------------------------------------------
		//	fSetMaritalStatus
		//	--------------------------------------------
		fSetMaritalStatus: function (maritalStatusInitial) {
			var maritalStatus;
			var maritalChange = false;
			var selectedMaritalStatus = this.getView().byId("slMaritalStatus").getSelectedKey();
			
			if (maritalStatusInitial) {
				maritalStatus = maritalStatusInitial;
				this.getView().setModel(maritalStatus, "ET_MARITAL_STATUS");
			} else {
				maritalStatus = this.getView().getModel("ET_MARITAL_STATUS");
				
				//Solicita tela de dependentes se:
				//Alterar de casado para: Divorciado, Separado, Solteiro ou Viúvo OU
				//Alterar de Divorciado, Separado, Solteiro ou Viúvo para casado
				if (selectedMaritalStatus !== maritalStatus) {
					if ((maritalStatus === "1" && (selectedMaritalStatus === "3" || selectedMaritalStatus === "5" || selectedMaritalStatus === "0" ||
					selectedMaritalStatus === "2")) ||
					(selectedMaritalStatus === "1" && (maritalStatus === "3" || maritalStatus === "5" || maritalStatus === "0" || maritalStatus ===
					"2"))) {
						
						maritalChange = true;
					}
				}
			}
			
			return maritalChange;
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
				
				that.getView().setModel(oValue, "ET_PERS_DATA");
				
				//Isolates the model
				var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
				that.getView().setModel(oDataOrig, "ET_PERS_DATA_ORIG");
				
				that.getView().byId("slMaritalStatus").setSelectedKey(oEvent.BLOCK.FAMST);
				that.getView().byId("slRace").setSelectedKey(oEvent.BLOCK.RACE);
				
				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);
				
				if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}
				
				if (oEvent.BLOCK.GESCH == 1) {
					that.getView().byId("rbMale").setSelected(true);
				} else {
					that.getView().byId("rbFemale").setSelected(true);
				}
				
				that.getView().byId("ipSocialName").setVisible(oEvent.BLOCK.NMSOC !== "");
				that.getView().byId("cbSocialname").setSelected(oEvent.BLOCK.NMSOC !== "");
				
				// se tem id verificar os anexos
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
					
					var filters = [];
					
					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];
					
					that.getView().setModel(oModel, "anexo");
					
					// Update list binding
					that.getView().byId("upldAttachments").getBinding("items").filter(filters);
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
				that.fSetMaritalStatus(oEvent.BLOCK.FAMST);
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
			}
			
			//MAIN READ
			oModel.read("ET_PERS_DATA" + urlParam, null, null, false, fSuccess, fError);
			
		},
		
		// --------------------------------------------
		// fCheckObligatoryFieldsChange
		// -------------------------------------------- 
		fCheckObligatoryFieldsChange: function () {
			var aActualData = this.getView().getModel("ET_PERS_DATA").getData();
			var aOrigData = this.getView().getModel("ET_PERS_DATA_ORIG");
			var obligatoryChanged = false;
			var sex;
			var maritalStatus = this.getView().byId("slMaritalStatus").getSelectedKey();
			
			if (this.getView().byId("rbMale").getSelected()) {
				sex = "1";
			} else {
				sex = "2";
			}
			
			if (aActualData.CNAME.trim() !== aOrigData.CNAME.trim() ||
			sex !== aOrigData.GESCH ||
			aActualData.GBDAT !== aOrigData.GBDAT ||
			aActualData.GBLND !== aOrigData.GBLND ||
			aActualData.GBDEP !== aOrigData.GBDEP ||
			aActualData.GBORT.trim() !== aOrigData.GBORT.trim() ||
			aActualData.NATIO !== aOrigData.NATIO ||
			maritalStatus !== aOrigData.FAMST) {
				
				obligatoryChanged = true;
			}
			
			return obligatoryChanged;
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
		//	onFieldChange
		//	--------------------------------------------		
		onFieldChange: function (oEvent) {
			var that = this;
			var fieldName = oEvent.getParameter("id").substring(12);
			
			if( fieldName !== "slRace" ){
				this.changedData.push(fieldName);
			}	
			
			if (fieldName !== "rbgSex" & fieldName !== "slMaritalStatus" & fieldName !== "slRace") {
				if (this.getView().byId(fieldName).getRequired() === true) {
					this.fValidationObligatoryFields(fieldName);
				}
			}
			
			
			
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},
		
		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
			var globalData = this.getView().getModel("ET_GLOBAL_DATA"); 
			
			this.fSetSearchHelpValue(oModel, "ET_SH_COUNTRY");
			this.fSetSearchHelpValue(oModel, "ET_SH_NATIONALITY");
			this.fSetSearchHelpValue(oModel, "ET_SH_RACE");
			
			
			
			var urlParam = this.fFillURLFilterParam("IM_BUKRS", globalData.IM_BUKRS);
			this.fSetSearchHelpValue(oModel, "ET_SH_MARITAL_STATUS", urlParam);
			
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
			
		},
		
		//	--------------------------------------------
		//	fValidInputFields
		//	--------------------------------------------		
		fValidInputFields: function () {
			this.fObligatoryFields();
			
			var dpBornDate = this.fVerifyError("dpBornDate");
			var ipFullName = this.fVerifyError("ipFullName");
			var ipFullName = this.fVerifyError("ipSocialName");
			var ipBirthplace = this.fVerifyError("ipBirthplace");
			var ipBirthCountry = this.fVerifyError("ipBirthCountry");
			var ipState = this.fVerifyError("ipState");
			var ipNationality = this.fVerifyError("ipNationality");
			
			if (dpBornDate === false && ipFullName === false &&
				ipBirthplace === false && ipBirthCountry === false &&
				ipState === false && ipNationality === false) {
					
					return false;
				} else {
					return true;
				}
			},
			
			//	--------------------------------------------
			//	fObligatoryFields
			//	--------------------------------------------
			fObligatoryFields: function () {
				this.fValidationObligatoryFields("ipFullName");
				this.fValidationObligatoryFields("dpBornDate");
				this.fValidationObligatoryFields("ipBirthplace");
				this.fValidationObligatoryFields("ipBirthCountry");
				this.fValidationObligatoryFields("ipState");
				this.fValidationObligatoryFields("ipNationality");
			},
			
			//	--------------------------------------------
			//	onHelpRequestBirthplace
			//	--------------------------------------------		
			onHelpRequestBirthplace: function () {
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
				"ipBirthplace", "ipBirthplace", true, false);
			},
			
			//	--------------------------------------------
			//	fSearchHelpBirthPlace
			//	--------------------------------------------
			fSearchHelpBirthPlace: function () {
				var urlParam = "";
				var ipBirthCountry = this.getView().byId("ipBirthCountry").getValue();
				var ipState = this.getView().byId("ipState").getValue();
				var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
				
				if (ipBirthCountry !== "" & ipBirthCountry !== undefined) {
					urlParam = this.fFillURLFilterParam("IM_COUNTRY", ipBirthCountry);
				}
				
				if (ipState !== "" & ipState !== undefined) {
					urlParam = this.fFillURLFilterParam("IM_REGION", ipState, urlParam);
				}
				
				this.fSetSearchHelpValue(oModel, "ET_SH_LOCAL_OF_BIRTH", urlParam);
				
			},
			
			//	--------------------------------------------
			//	fSearchHelpRegion
			//	--------------------------------------------
			fSearchHelpRegion: function () {
				var urlParam = "";
				var ipBirthCountry = this.getView().byId("ipBirthCountry").getValue();
				var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
				
				if (ipBirthCountry !== "" & ipBirthCountry !== undefined) {
					urlParam = this.fFillURLFilterParam("IM_COUNTRY", ipBirthCountry);
				}
				
				this.fSetSearchHelpValue(oModel, "ET_SH_REGION", urlParam);
				
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
				// oCreate.IM_TYPE_SAVE = req;
				oCreate.IM_LOGGED_IN = oGlobalData.IM_LOGGED_IN;
				oCreate.IM_PERNR = oGlobalData.IM_PERNR;
				oCreate.IM_BUKRS = oGlobalData.IM_BUKRS;
				oCreate.OBSERVATION = that.getView().byId("taJust").getValue();
				
				if (oCreate.IM_LOGGED_IN == 5) {
					oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
				}
				
				that.fFillCreatePersonalData(oCreate, that, action, req, newDt);
				
				//SUCESSO
				function fSuccess(oEvent) {
					that.obligatoryChanged = false;
					
					oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;
					
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
              var maritalChange = that.fSetMaritalStatus();
              
              if (maritalChange) {
                
                MessageBox.confirm("Foi alterado o estado civil, deseja alterar os dependentes?", {
                  title: "Estado Civil",
                  initialFocus: sap.m.MessageBox.Action.CANCEL,
                  onClose: function (sButton) {
                    if (sButton === MessageBox.Action.OK) {
                      
                      that.getRouter().myNavToWithoutHash({
                        currentView: that.getView(),
                        targetViewName: "autoServico.view.DetailDependents",
                        targetViewType: "XML",
                        transition: "slide"
                      });
                      
                      //Sets the Dependents object list marked
                      var masterList = $("div[id$='master1List']");
                      var masterListcomponent = sap.ui.getCore().byId(masterList[masterList.length - 1].id);
                      var list = masterListcomponent.getItems();
                      var dependentLocationInArray;
                      
                      //Finds the position of the dependent object list 
                      for (var i = 0; i < list.length; i++) {
                        if (list[i].sId.substring(12, 15) === "103") {
                          dependentLocationInArray = i;
                          break;
                        }
                      }
                      
                      //Sets Dependents marked
                      if (dependentLocationInArray !== undefined) {
                        masterListcomponent.setSelectedItem(list[dependentLocationInArray]);
                      }
                      return true;
                    }
                  }
                });
              }
              break;
						
						case "C":
              MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");
              
              that.fGetBlock();
              that.fVerifyAction(false, "C");
              
              var oUploadCollection = that.getView().byId("upldAttachments");
              oUploadCollection.destroyItems();
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
                that.fVerifyAction(false, "R");
                
              // *** ANEXO ***
              that.saveAttachment(oGlobalData.IM_REQUISITION_ID,'G');
              break;
						}
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
					oModel.create("ET_PERS_DATA", oCreate, null, fSuccess, fError);
				},
				
				// --------------------------------------------
				// fFillCreatePersonalData
				// --------------------------------------------
				fFillCreatePersonalData: function (oCreate, that, action, req, newDt) {
					
					if (that.getView().byId("rbMale").getSelected()) {
						oCreate.BLOCK.GESCH = "1";
					} else {
						oCreate.BLOCK.GESCH = "2";
					}
					
					oCreate.BLOCK.CNAME = that.getView().byId("ipFullName").getValue();
					// oCreate.BLOCK.SNAME = that.getView().byId("ipSocialName").getValue();
					oCreate.BLOCK.GBLND = that.getView().byId("ipBirthCountry").getValue();
					oCreate.BLOCK.GBORT = that.getView().byId("ipBirthplace").getValue();
					oCreate.BLOCK.GBDEP = that.getView().byId("ipState").getValue();
					oCreate.BLOCK.NATIO = that.getView().byId("ipNationality").getValue();
					oCreate.BLOCK.ANZKD = "000";
					oCreate.BLOCK.FAMST = that.getView().byId("slMaritalStatus").getSelectedKey();
					oCreate.BLOCK.RACE = that.getView().byId("slRace").getSelectedKey();
					oCreate.BLOCK.TYPE_SAVE = req;
					
					if (newDt !== "" && newDt !== undefined) {
						oCreate.BLOCK.SSG_DATE = newDt;
					} else {
						oCreate.BLOCK.SSG_DATE = null;
					}
					
					if (this.getView().byId("cbSocialname").getSelected()) {
						oCreate.BLOCK.NMSOC = that.getView().byId("ipSocialName").getValue();
					}
					
					if (that.getView().byId("dpBornDate").getValue() !== "" & that.getView().byId("dpBornDate").getValue() !== " " &
					that.getView().byId("dpBornDate").getValue() !== undefined) {
						oCreate.BLOCK.GBDAT = that.getView().byId("dpBornDate").getValue();
					}
					
					//User can save/cancel a requisition without inputting required data. However, DATE is only acceptable by gateway if it's null
					if (action === "R" || action === "C") {
						if (oCreate.BLOCK.GBDAT === "" || oCreate.BLOCK.GBDAT === " " || oCreate.BLOCK.GBDAT === undefined) {
							oCreate.BLOCK.GBDAT = null;
						}
					}
					
				},
				
				// --------------------------------------------
				// fGetRequisitionId
				// --------------------------------------------
				fGetRequisitionId: function (oEvent) {
					var detail = $(oEvent.response.body).find("errordetail").first().text();
					
					if (detail.substring(0, 2) === "99" & detail.substring(3, 6) === "999") {
						return detail.substring(15, 23);
					}
				},
				
				// --------------------------------------------
				// fUnableFields
				// -------------------------------------------- 		
				fUnableFields: function (closeButtons) {
					var oView = this.getView();
					
					oView.byId("ipFullName").setEditable(false);
					oView.byId("ipBirthplace").setEditable(false);
					oView.byId("ipBirthCountry").setEditable(false);
					oView.byId("ipNationality").setEditable(false);
					oView.byId("ipState").setEditable(false);
					oView.byId("rbgSex").setEditable(false);
					oView.byId("dpBornDate").setEditable(false);
					oView.byId("taJust").setEditable(false);
					oView.byId("slMaritalStatus").setEnabled(false);
					oView.byId("slRace").setEnabled(false);
					
					if (closeButtons === true) {
						// oView.byId("btnSanity").setEnabled(false);
						oView.byId("btnSave").setEnabled(false);
						oView.byId("btnAccept").setEnabled(false);
						oView.byId("btnCancel").setEnabled(false);
					}
				},
				
				// --------------------------------------------
				// onRaceSelect
				// -------------------------------------------- 		
				onRaceSelect: function () {
					this.getView().byId("btnSanity").setVisible(false);
					this.getView().byId("btnAccept").setEnabled(true);
					this.getView().byId("btnSave").setEnabled(true);
				},
				
				// --------------------------------------------
				// onPress
				// -------------------------------------------- 
				onPress: function (oEvent) {
					var buttonName = oEvent.getParameter("id").substring(12);
					var oBundle = this.getView().getModel("i18n").getResourceBundle();
					var oQuickViewModelText;
					
					switch (buttonName) {
						case "btnQuickViewFullName":
						oQuickViewModelText = new sap.ui.model.json.JSONModel({
							text: oBundle.getText("texto_explicativo_nome_completo"),
							header: oBundle.getText("nome_compl")
						});
						this._Dialog = sap.ui.xmlfragment("autoServico.view.QuickView", this);
						break;
						
						case "btnQuickViewSocialName":
						oQuickViewModelText = new sap.ui.model.json.JSONModel({
							text: oBundle.getText("texto_explicativo_nome_social"),
							header: oBundle.getText("nome_social")
						});
						this._Dialog = sap.ui.xmlfragment("autoServico.view.QuickView", this);
						break;
						
						case "btnQuickViewHelp":
						oQuickViewModelText = new sap.ui.model.json.JSONModel({
							text: oBundle.getText("texto_explicativo_help"),
							header: "Ajuda"
						});
						this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpPersonalData", this);
						break;
						
						case "btnQuickViewMaritalStatus":
						var text = oBundle.getText("texto_explicativo_solteiro");
						text = text + oBundle.getText("texto_explicativo_casado");
						text = text + oBundle.getText("texto_explicativo_separado");
						text = text + oBundle.getText("texto_explicativo_divorciado");
						text = text + oBundle.getText("texto_explicativo_viuvo");
						
						oQuickViewModelText = new sap.ui.model.json.JSONModel({
							text: text,
							header: oBundle.getText("estado_civil")
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
				// onSave
				// --------------------------------------------  
				onSave: function () {
					
					if ( this.changedData.length > 0 ){
						var attachment = this.fValidAttachment();
					}	
					
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
					if ( this.changedData.length > 0 ){
						var attachment = this.fValidAttachment();
					}
					var that = this;
					var oBundle = this.getView().getModel("i18n").getResourceBundle();
					var message = oBundle.getText("termo_responsabilidade");
					
					var obligAttach = this.fCheckObligatoryFieldsChange();
					
					if (this.fValidInputFields() === true) {
						this.handleErrorMessageBoxPress();
					} else if (!attachment && (obligAttach || this.obligatoryChanged)) {
						this.handleErrorMessageAttachment();
					} else { //if ((obligAttach === false || attachment === true) && this.obligatoryChanged === false)  {
						MessageBox.confirm(
							message, {
								title: "Termo de responsabilidade",
								initialFocus: sap.m.MessageBox.Action.CANCEL,
								onClose: function (sButton) {
									if (sButton === MessageBox.Action.OK) {
										that.fActions(that, "envio", "S");
										return true;
									}
								}
							});
						}
					},
					
					// --------------------------------------------
					// onCancel
					// -------------------------------------------- 		
					onCancel: function () {
						
						var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
						var observationSSG = this.getView().byId("taJustSSG").getValue();
						this.getView().byId("txtBirthCountry").setText();
						this.getView().byId("txtState").setText();
						this.getView().byId("txtNationality").setText();
						
						
						if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
							this.handleErrorMessageBoxDisapprove();
						} else {
							this.fActions(this, "Cancelamento", "C");
						}
						
					},
					
					// --------------------------------------------
					// onSanitation
					// --------------------------------------------  
					onSanitation: function () {
						
						var that = this;
						var oBundle = this.getView().getModel("i18n").getResourceBundle();
						var message = oBundle.getText("termo_responsabilidade");
						
						MessageBox.confirm(
							message, {
								title: "Termo de responsabilidade",
								initialFocus: sap.m.MessageBox.Action.CANCEL,
								onClose: function (sButton) {
									if (sButton === MessageBox.Action.OK) {
										that.fActions(that, "saneamento", "X");
										return true;
									}
								}
							});
							
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
						// onSocialNameSelect
						// --------------------------------------------  
						onSocialNameSelect: function () {
							this.getView().byId("ipSocialName").setVisible(this.getView().byId("cbSocialname").getSelected());
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