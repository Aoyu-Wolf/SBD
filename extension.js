game.import("extension", function (lib, game, ui, get, ai, _status) {
    function canUpdate() {
		if (typeof game.writeFile != 'function') {
			return '写入文件失败！';
		}
		
		// if (!navigator.onLine) {
		// 	return '未联网,请检查网络连接';
		// }
		
		return true;
	}

    let brokenFileArr = lib.config.extension_更新_brokenFile || [];
	brokenFileArr = Array.from(new Set([...brokenFileArr, ...lib.config.brokenFile]));

	Object.defineProperty(lib.config, 'extension_更新_brokenFile', {
		configurable: true,
		enumerable: true,
		get() { 
            return brokenFileArr;
        },
		set(newValue) { 
            if (Array.isArray(newValue)) brokenFileArr = newValue;
        }
	});

	window.addEventListener('beforeunload', () => {
		if (brokenFileArr && brokenFileArr.length) {
			for (let i = 0; i < brokenFileArr.length; i++) {
				game.removeFile(brokenFileArr[i]);
			}
		}
		game.saveExtensionConfig('更新', 'brokenFile', Array.from(new Set([...brokenFileArr, ...lib.config.brokenFile])));
	});
	
    const response_then = (current, response) => {
		const ok = response.ok, 
		status = response.status, 
		statusText = response.statusText;
		//const { ok, status, statusText } = response;
		if (!ok) {
			//状态码
			switch(status) {
				case 400 :
					game.print("400");
					throw {current, status, statusText: "400"};
				case 403 :
					game.print("403");
					throw {current, status, statusText: "403"};
				case 404 :
					game.print("404");
					throw {current, status, statusText: "404"};
				case 429 :
					game.print("429");
					throw {current, status, statusText: "429"};
				default:
					game.print(statusText);
					throw {current, status, statusText};
			}
		} else {
			return response.text();
		}
	};
	
	const response_catch = err => {
		console.error(err);
		game.print(err);
		if (typeof err  === 'object' && err.constructor != Error) {
			const current = err.current, 
			status = err.status, 
			statusText = err.statusText;
			//const { current, status, statusText } = err;
			if (typeof current == 'undefined' || typeof status == 'undefined' || typeof statusText == 'undefined') {
				const stack = err.stack;
				//const { stack } = err;
				if (!stack) {
					alert( JSON.stringify(err) );
				} else {
					alert( decodeURI(stack) );
				}
			} else {
				alert(`网络请求目标：${current}\n状态码：${status}`);
			}
		} else {
			alert(err);
		}

        if (typeof game.updateErrors == 'number' && game.updateErrors >= 5) {
            alert('报错过多,请手动下载');
            game.updateErrors = 0;
        }
	};

    const assetConfigDiv = {};

    const assetConfigFun = function (configName) {
        return function(bool) {
            //game.saveConfig(this._link.config._name, bool);
            game.saveExtensionConfig('更新', configName, bool);
            const div = assetConfigDiv[configName];
            const bindTarget = assetConfigDiv[configName + '_bindTarget'];
            if (this && this._link) {
                !div && (assetConfigDiv[configName] = this);
                bindTarget && (bindTarget.checked = bool);
            } else if (div) {
                div.classList.toggle('on', bool);
            }
        }
    };
	
    return {
        name: "尘封秘籍", content: function (config, pack) {
    
        },
        precontent: function () {
    Object.assign(lib.updateURLS, {
				fastgit: 'https://github.com/Aoyu-Wolf/SBD',
			});
			
			if (!game.getExtensionConfig('更新', 'update_link')) {
				game.saveConfig('update_link', 'fastgit');
				game.saveExtensionConfig('更新', 'update_link', 'fastgit');
				lib.updateURL = lib.updateURLS['fastgit'];
			}

            /**
             * @description 
             * @param { string } url 
             * @param { VoidFunction } onsuccess
             * @param { VoidFunction } onerror
             */

			game.shijianDownload = (url, onsuccess, onerror) => {
				let alertStr;
				if( (alertStr = canUpdate()) !== true ) {
					return alert(alertStr);
				}
				
				let downloadUrl = url, path = '', name = url;
				if (url.indexOf('/') != -1) {
					path = url.slice(0, url.lastIndexOf('/'));
					name = url.slice(url.lastIndexOf('/') + 1);
				}
				
				lib.config.brokenFile.add(url);
				
				if(url.indexOf('http') != 0){
					url = lib.updateURL + '/master/' + url;
				}
				
				function success() {
					lib.config.brokenFile.remove(downloadUrl);
					game.saveConfigValue('brokenFile');
					if(typeof onsuccess == 'function'){
						onsuccess();
					}
				}
				
				function error(e, statusText) {
					if(typeof onerror == 'function'){
						onerror(e, statusText);
					} else console.error(e);
				}
				
				fetch(url)
					.then(response => {
						const ok = response.ok, 
						status = response.status, 
						statusText = response.statusText;
						//const { ok, status, statusText } = response;
						if (!ok) {
							return error(status, statusText);
						} else {
							return response.arrayBuffer();
						}
					})
					.then(arrayBuffer => {
						// 写入文件
						if (!arrayBuffer) return;
						game.ensureDirectory(path, () => {
			                if (lib.node && lib.node.fs) {
			                    lib.node.fs.writeFile(__dirname + '/' + path + '/' + name, Buffer.from(arrayBuffer), null, e => {
			                        if (e) {
			                            error(e, 'writeFile');
			                        } else {
			                            success();
			                        }
			                    });
			                } else if (typeof window.resolveLocalFileSystemURL == 'function') {
			                    window.resolveLocalFileSystemURL(lib.assetURL + path, entry => {
			                        entry.getFile(name, { create: true }, fileEntry => {
			                            fileEntry.createWriter(fileWriter => {
			                                fileWriter.onwriteend = () => {
			                                    success();
			                                };
			                                fileWriter.write(arrayBuffer);
			                            }, e => {
			                                error(e, 'writeFile');
			                            });
			                        });
			                    });
			                }
			            });
						
					})
					.catch(error);
			};
			
			game.shijianDownloadFile = (current, onsuccess, onerror) => {
				let alertStr;
				if( (alertStr = canUpdate()) !== true ) {
					return alert(alertStr);
				}
				let reload = (err, statusText) => {
					onerror(current, statusText);
					setTimeout(() => {
						let str1 = "下载中：";
						let current3 = current.replace(lib.updateURL, '');
			
						if (current3.indexOf('theme') == 0) {
							game.print(str1 + current3.slice(6));
						} else if (current3.indexOf('image/skin') == 0) {
							game.print(str1 + current3.slice(11));
						} else {
							game.print(str1 + current3.slice(current3.lastIndexOf('/') + 1));
						}
			
						game.shijianDownloadFile(current, onsuccess, onerror);
					}, 500);
				};
				game.shijianDownload(current, function success() {
					onsuccess(current);
				}, function error(e, statusText) {
					if (typeof e == 'number') {
						switch(e) {
							case 404 :
								game.print("404");
								console.log({current, e, statusText: "404"});
								return onsuccess(current, true);
							case 429 :
								game.print("429");
								//console.error({current, e, statusText: "429"});
								onerror(current, e, "429");
								break;
							default:
								game.print(e);
								//console.error(current, e);
								onerror(current, e, statusText);
						}
					} else if (statusText === 'writeFile') {
						game.print("写入文件失败");
						//console.error(current, '写入文件失败');
						onerror(current, e, '写入文件失败');
					} else {
						game.print(e);
						//console.error(current, e);
						onerror(current, e, statusText);
					}
					reload(e, statusText);
				});
			};
			
			game.shijianMultiDownload = (list, onsuccess, onerror, onfinish) => {
				let alertStr;
				if( (alertStr = canUpdate()) !== true ) {
					return alert(alertStr);
				}
				list = list.slice(0);
				let download = () => {
					if (list.length) {
						let current = list.shift();
						let str1 = "正在下载：";
			
						if (current.indexOf('theme') == 0) {
							game.print(str1 + current.slice(6));
						} else if (current.indexOf('image/skin') == 0) {
							game.print(str1 + current.slice(11));
						} else {
							game.print(str1 + current.slice(current.lastIndexOf('/') + 1));
						}
			
                        game.shijianDownloadFile(current, (current, bool) => {
							onsuccess(current, bool);
							download();
						}, (e, statusText) => {
							onerror(current, e, statusText);
						});
			
					} else {
						onfinish();
					}
				};
				download();
			};

			if (brokenFileArr && brokenFileArr.length) {
                if (confirm(`下载失败的文件有(${brokenFileArr})，是否进行重新下载?`)) {
                    console.log('下载失败：', brokenFileArr);
                    game.shijianMultiDownload(brokenFileArr, (current, bool) => {
                        brokenFileArr.remove(current);
                        game.saveExtensionConfig('更新', 'brokenFile', brokenFileArr);
                        lib.config.brokenFile.remove(current);
                        game.saveConfigValue('brokenFile');
                        if (bool) {
                            console.error(`${current}不存在`);
                        } else {
                            console.log(`${current}下载成功`);
                        }
                    }, (current, e, statusText) => {
                        console.error(`${current}下载失败`, { e, statusText });
                    }, () => {
                        alert('自启动以应用更新');
                        game.reload();
                    });
                } else {
                    console.log('复原下载列表');
                    brokenFileArr = [];
                    lib.config.brokenFile = [];
                    game.saveConfigValue('brokenFile');
                }
			}
        }, config: {
     show_version: {
                clear: true,
                nopointer: true,
                name: '版本1.0',
            },
			checkForUpdate: {
				clear: true,
				intro: '更新扩展',
				name: '<button type="button">更新扩展</button>',
				onclick: function() {
					let alertStr;
					if( (alertStr = canUpdate()) !== true ) {
						return alert(alertStr);
					}
                    let button;
                    if (this instanceof HTMLButtonElement) {
                        button = this;
                    } else {
                        button = this.childNodes[0].childNodes[0];
                    }
                    let parentNode = button.parentNode;
                    if (game.Updating) {
                        return alert('正在更新');
                    }
                    if (game.allUpdatesCompleted) {
                        return alert('更新完毕');
                    }
                    if (button.innerText != '更新扩展') return;
					game.Updating = true;
                    game.unwantedToUpdate = false;
                    typeof game.updateErrors == 'number' ? game.updateErrors++ : game.updateErrors = 0;
					const updateURL = lib.updateURL + '/master/';
					const reduction = () => {
						game.Updating = false;
                        button.innerText = '更新扩展';
                        button.disabled = false;
					};
					if (button.disabled) {
						return;
					} else if (!game.download) {
						return alert('请手动更新');
					} else {
						button.innerHTML = '正在检查更新';
						button.disabled = true;
						fetch(`${updateURL}update.js`)
							.then(response => {
								return response_then('update.js', response);
							})
							.then(text => {
								//赋值window.noname_update
								try {
									eval(text);
								} catch (e) {
									game.Updating = false;
									button.innerHTML = '检查游戏更新';
									button.disabled = false;
									return alert('更新内容获取失败，请重试');
								}
								let update = window.noname_update;
								delete window.noname_update;
								game.saveConfig('check_version', update.version);
								if (update.version == lib.version) {
									//要更新的版本和现有的版本一致
									if (!confirm('当前版本已经是最新，是否覆盖更新？')) {
										game.Updating = false;
										button.innerHTML = '检查游戏更新';
										button.disabled = false;
										return;
									}
								} else {
                                    let entries1 = lib.version.split('.').map(item => Number(item) || 0).entries();
                                    let entries2 = update.version.split('.').map(item => Number(item) || 0).entries();
                                    
                                    do {
                                        let next1 = entries1.next();
                                        let next2 = entries2.next();

                                        // 当前游戏版本
                                        let version1 = next1.value ? next1.value[1] : 0;
                                        // 要更新的版本，如果当前游戏版本大于这个版本，则提示用户
                                        let version2 = next2.value ? next2.value[1] : 0;

                                        if (version1 > version2) {
                                            if (!confirm('游戏版本比服务器提供的版本还要高，是否覆盖更新？')) {
                                                game.Updating = false;
                                                button.innerHTML = '检查游戏更新';
                                                button.disabled = false;
                                                return;
                                            } else {
                                                break;
                                            }
                                        } else if (next1.done && next2.done || version1 < version2) {
                                            break;
                                        }
                                    } while (true);
                                }

								let files = null;
								let version = lib.version;

								let goupdate = (files, update) => {
									lib.version = update.version;
									fetch(`${updateURL}update.js`)
										.then(response => {
											return response_then('update.js', response);
										})
										.then(text => {
											try {
												eval(text);
											} catch (e) {
												game.Updating = false;
												button.innerHTML = '检查游戏更新';
												button.disabled = false;
                                                lib.version = version;
												return alert('获取服务器文件失败，请重试');
											}
											let updates = window.noname_source_list;
											delete window.noname_source_list;

											if (!game.getExtensionConfig('在线更新', 'updateAll') && Array.isArray(files)) {
												files.add('update.js');
												let files2 = [];
												for (let i = 0; i < files.length; i++) {
													let str = files[i].indexOf('*');
													if (str != -1) {
														str = files[i].slice(0, str);
														files.splice(i--, 1);
														for (let j = 0; j < updates.length; j++) {
															if (updates[j].indexOf(str) == 0) {
																files2.push(updates[j]);
															}
														}
													}
												}
												updates = files.concat(files2);
											}

											for (let i = 0; i < updates.length; i++) {
												if (updates[i].indexOf('node_modules/') == 0 /*&& !update.node*/ ) {
													//只有电脑端用，没有nodejs环境跳过
													if (!lib.node || !lib.node.fs) {
														updates.splice(i--, 1);
														continue;
													};
													let entry = updates[i];
													lib.node.fs.access(__dirname + '/' + entry, function(err) {
														if (!err) {
															const size = lib.node.fs.statSync(__dirname + '/' + entry).size;
															size == 0 && (err = true);
														}
														!err && updates.splice(i--, 1);
													});
												}
											}

											button.remove();

                                            if (this != button) {
                                                let consoleMenu = document.createElement('button');
                                                consoleMenu.setAttribute('type', 'button');
                                                consoleMenu.innerHTML = '跳转到命令页面';
                                                consoleMenu.onclick = ui.click.consoleMenu;
                                                parentNode.appendChild(consoleMenu);
                                                parentNode.appendChild(document.createElement('br'));
                                            }

											let span = document.createElement('span');
											let n1 = 0;
											let n2 = updates.length;
											span.innerHTML = `正在下载文件（${n1}/${n2}）`;
                                            parentNode.insertBefore(span, parentNode.firstElementChild);

											game.shijianMultiDownload(updates, (current, bool) => {
												if (bool) {
													game.print(`${current.slice(current.lastIndexOf('/') + 1)}不存在，不需要下载`);
													console.error(`${current.slice(current.lastIndexOf('/') + 1)}不存在，不需要下载`);
												} else {
													game.print(`${current.slice(current.lastIndexOf('/') + 1)}下载成功`);
													console.log(`${current.slice(current.lastIndexOf('/') + 1)}下载成功`);
												}
												n1++;
												span.innerHTML = `正在下载文件（${n1}/${n2}）`;
											}, (current, e, statusText) => {
												console.error(`${current}下载失败`, {e, statusText});
											}, () => {
												span.innerHTML = `更新完毕（${n1}/${n2}）`;
												setTimeout(() => {
                                                    if (!game.UpdatingForAsset) {
                                                        alert('更新完成');
                                                        if (game.unwantedToUpdateAsset) game.allUpdatesCompleted = true;
													}
													game.Updating = false;
                                                    game.unwantedToUpdate = true;
                                                    typeof consoleMenu != 'undefined' && consoleMenu.remove();
                                                    parentNode.insertBefore(document.createElement('br'), parentNode.firstElementChild);
													let button2 = document.createElement('button');
													button2.innerHTML = '重新启动';
													button2.onclick = game.reload;
													button2.style.marginTop = '8px';
                                                    parentNode.insertBefore(button2, parentNode.firstElementChild);
												}, 1000);
											});
										})
										.catch(err => {
											response_catch(err);
											reduction();
										});
								};

								if (Array.isArray(update.files) && update.update) {
                                    // 当前游戏版本
									let version1 = version.split('.');
									// update里要更新的版本，如果当前游戏版本是这个版本，就只更新update.files里的内容
									let version2 = update.update.split('.');
									
									for (let i = 0; i < version1.length && i < version2.length; i++) {
										if (+version2[i] > +version1[i]) {
											files = false;
											break;
										} else if (+version1[i] > +version2[i]) {
											files = update.files.slice(0);
											break;
										}
									}
									if (files === null) {
										if (version1.length >= version2.length) {
											files = update.files.slice(0);
										}
									}
								}

								let str = '有新版本' + update.version + '可用，是否下载？';
								if (navigator.notification && navigator.notification.confirm) {
									let str2 = update.changeLog[0];
									for (let i = 1; i < update.changeLog.length; i++) {
										if (update.changeLog[i].indexOf('://') == -1) {
											str2 += '；' + update.changeLog[i];
										}
									}
									navigator.notification.confirm(
										str2,
										function(index) {
											if (index == 1) {
												goupdate(files, update);
											} else {
                                                // 还原版本
                                                lib.version = version;
												game.Updating = false;
												button.innerHTML = '检查游戏更新';
												button.disabled = false;
											}
										},
										str,
										['确定', '取消']
									);
								} else {
									if (confirm(str)) {
										goupdate(files, update);
									} else {
                                        // 还原版本
                                        lib.version = version;
										game.Updating = false;
										button.innerHTML = '检查游戏更新';
										button.disabled = false;
									}
								}
							})
							.catch(err => {
								response_catch(err);
								reduction();
							});
					}
				},
			},
},help:{},package:{
    character:{
        character:{
        },
        translate:{
        },
    },
    card:{
        card:{
            window:{
                type:"equip",
                subtype:"equip5",
                skills:["mlsb"],
                ai:{
                    basic:{
                        equipValue:13,
                        order:function (card,player){
                if(player&&player.hasSkillTag('reverseEquip')){
                    return 8.5-get.equipValue(card,player)/20;
                }
                else{
                    return 8+get.equipValue(card,player)/20;
                }
            },
                        useful:2,
                        value:function (card,player,index,method){
                if(player.isDisabled(get.subtype(card))) return 0.01;
                var value=0;
                var info=get.info(card);
                var current=player.getEquip(info.subtype);
                if(current&&card!=current){
                    value=get.value(current,player);
                }
                var equipValue=info.ai.equipValue;
                if(equipValue==undefined){
                    equipValue=info.ai.basic.equipValue;
                }
                if(typeof equipValue=='function'){
                    if(method=='raw') return equipValue(card,player);
                    if(method=='raw2') return equipValue(card,player)-value;
                    return Math.max(0.1,equipValue(card,player)-value);
                }
                if(typeof equipValue!='number') equipValue=0;
                if(method=='raw') return equipValue;
                if(method=='raw2') return equipValue-value;
                return Math.max(0.1,equipValue-value);
            },
                    },
                    result:{
                        target:function(player,target,card){
                return get.equipResult(player,target,card.name);
            },
                    },
                },
                enable:true,
                selectTarget:-1,
                filterTarget:function (card,player,target){
        return target==player;
    },
                modTarget:true,
                allowMultiple:false,
                content:function (){
        if(cards.length&&get.position(cards[0],true)=='o') target.equip(cards[0]);
    },
                toself:true,
                fullimage:true,
                image:"ext:高达宇宙(同人作)/mlsb.jpg",
            },
        },
        translate:{
            window:"视窗",
            "window_info":"装备了此牌\\准备阶段,你获得两张随机衍生牌,然后获得一点护甲,恢复一点体力,并将一张马良的神笔和一张随机衍生牌洗入牌堆②当你受到致命伤害时,防止之然后弃置[神笔]并摸两张牌回满体力③你打出牌无距离和次数限制④你可以将一张牌 当做任意一张牌打出⑤你有更好几率获得好牌",
        },
        list:[],
    },
    skill:{
        skill:{
        },
        translate:{
        },
    },
    intro:"",
    author:"Aoyu傲宇",
    diskURL:"",
    forumURL:"",
    version:"1.0",
},files:{"character":[],"card":["window.jpg"],"skill":[]}}})