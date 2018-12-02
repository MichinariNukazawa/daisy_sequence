'use strict';

module.exports = class ObjectUtil{
	static deepcopy(obj)
	{
		/*
		   let r = {};
		   for(let name in obj){
		   if(typeof obj[name] === 'object'){
		   r[name] = this.deep_clone_(obj[name]);
		   }else{
		   r[name] = obj[name];
		   }
		   }
		   return r;
		 */

		return JSON.parse(JSON.stringify(obj))
	}

	static remove_key(obj, keys)
	{
		ObjectUtil.removeKey(obj, keys);
	}

	static removeKey(obj, keys)
	{
		if(obj instanceof Array){
			obj.forEach(function(item){
				ObjectUtil.removeKey(item,keys)
			});
		}
		else if(typeof obj === 'object'){
			Object.getOwnPropertyNames(obj).forEach(function(key){
				if(keys.indexOf(key) !== -1)delete obj[key];
				else ObjectUtil.removeKey(obj[key],keys);
			});
		}
	}

	static make_member(obj, path, value)
	{
		return ObjectUtil.makeMember(obj, path, value);
	}

	static makeMember(obj, path, value)
	{
		const keys = path.split('.');
		let o = obj;
		for(let i = 0; i < keys.length; i++){
			if(undefined === o || null === o || typeof o !== 'object'){
				return false;
			}

			if(! o.hasOwnProperty(keys[i])){
				if(i !== (keys.length - 1)){
					o[keys[i]] = {};
				}else{
					o[keys[i]] = value;
				}
			}

			o = o[keys[i]];
		}

		return true;
	}

	static get_property_from_path(obj, path)
	{
		return ObjectUtil.getPropertyFromPath(obj, path);
	}

	static getPropertyFromPath(obj, path)
	{
		const keys = (typeof path === 'string')? path.split('.') : [path];
		let o = obj;
		for(let i = 0; i < keys.length; i++){
			if(undefined === o || null === o || typeof o !== 'object'){
				return null;
			}
			if(! o.hasOwnProperty(keys[i])){
				return null;
			}else{
				o = o[keys[i]];
			}
		}

		return o;
	}
};

