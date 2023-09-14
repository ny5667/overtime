function getCurUser() {
	return new Promise((resolve, reject) => {
		// 发送 POST 请求以获取当前用户信息
		fetch('https://ehr.supcon.com/RedseaPlatform/PtUsers.mc?method=getCurUserInfo', {
			method: 'POST'
		})
			.then(response => response.json())
			.then(data => {
				resolve(data.staffId)
			})
			.catch(error => {
				console.error('Error fetching current user:', error)
				reject(error);
			});
	});
}

async function getExtraWorkHour(year, month) {
	let staffId = await getCurUser();

	// 获取这个月总共有多少天
	let endCount = getDays(year, month);
	let totalExtraHour = 0
	//获取这个月加班超过晚八点次数
	let totalLaterThanEightPM = 0

	// 月份小于0时，需要在月份前加上0。例如1月改成01月
	month = month < 10 ? "0" + month : month

	for (let i = 1; i <= endCount; i++) {
		// 日小于0时，需要在日前加上0。例如1日改成01日
		let day = i < 10 ? year + "-" + month + "-0" + i : year + "-" + month + "-" + i
		const { extraHour, isLaterThanEightPM, beginDate, endDate, data } = getDayHour(staffId, day)
		if (!isNaN(extraHour) && extraHour > 0 && data) {
			// console.log(day + " " + data.datetypename + " : " + extraHour)
			console.log(`${day} ${data.datetypename} 开始时间：${formatDate(beginDate)}，结束时间：${formatDate(endDate)} : ${extraHour}`)
		}
		if (extraHour) {
			totalExtraHour += extraHour
		}
		if (isLaterThanEightPM) {
			totalLaterThanEightPM++
		}
	}

	console.log("加班总时间：" + totalExtraHour)
	console.log("加班超过晚八点次数：" + totalLaterThanEightPM)
}

function getDays(year, month) {
	// 数组从0开始
	month = month - 1;
	let days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	// 处理闰年
	if ((year % 4 === 0) && (year % 100 !== 0 || year % 400 === 0)) {
		days[1] = 29
	}
	return days[month]
}

function getDayHour(staffId, day) {
	let data
	$.ajax({
		url: "https://ehr.supcon.com/RedseaPlatform/getList/kq_count_SelectStaffIDDaily/CoreRequest.mc?staff_id=" + staffId + "&work_day=" + day,
		type: 'post',
		async: false,
		contentType: "application/x-www-form-urlencoded",
		success: function (res) {
			data = calData(res, day)
		}
	});
	return data
}

/**
 * 计算加班时间
 * @returns 计算
 */
function calData(res, day) {
	let extraHour = 0
	let isLaterThanEightPM = false
	let beginDate, endDate
	let data = res.result['#result-set-1'][0]
	if (data === undefined) {
		return { extraHour, isLaterThanEightPM, beginDate, endDate, data }
	}
	if (data.datetypename == "工作日") {
		return calWorkDay(data, day)
	} else {
		return calWeekendDay(data)
	}
}

/**
 * 计算工作日
 * @param {考勤数据} data 
 * * @param {日期} day
 * @returns 
 */
function calWorkDay(data, day) {
	let extraHour = 0
	let isLaterThanEightPM = false
	let beginDate, endDate

	let { beginDateStr, endDateStr } = getBeginDate(data)
	// 8点前不算上班
	if (beginDateStr < (day + " 08:00:00")) {
		beginDateStr = day + " 08:00:00";
	}
	// 上班时间9小时，吃饭时间半小时
	beginDate = new Date(new Date(beginDateStr).getTime() + 9.5 * 3600 * 1000)
	endDate = new Date(endDateStr)
	extraHour = (endDate - beginDate) / 3600 / 1000
	// 处理加班时间小于0.5小时的情况
	if (extraHour < 0.5) {
		extraHour = 0
	}
	if (endDate.getHours() >= 20) {
		isLaterThanEightPM = true
	}
	return { extraHour, isLaterThanEightPM, beginDate, endDate, data }
}

/**
 * 计算周末
 * @param {考勤数据} data 
 */
function calWeekendDay(data) {
	let extraHour = 0
	let isLaterThanEightPM = false
	let beginDate, endDate
	let { beginDateStr, endDateStr } = getBeginDate(data)
	beginDate = new Date(beginDateStr)
	endDate = new Date(endDateStr)
	extraHour = (endDate - beginDate) / 3600 / 1000
	return { extraHour, isLaterThanEightPM, beginDate, endDate, data }
}

/**
 * 获取开始加班和结束加班时间
 * @param {考勤数据} data 
 * @returns 
 */
function getBeginDate(data){
	let beginDateStr, endDateStr;
	if (data.sb_dk_time) {
		beginDateStr = data.sb_dk_time
	} else if (data.sb_dk_time2) {
		beginDateStr = data.sb_dk_time2
	} else if (data.sb_dk_time3) {
		beginDateStr = data.sb_dk_time3
	}
	if (data.xb_dk_time) {
		endDateStr = data.xb_dk_time
	} else if (data.xb_dk_time2) {
		endDateStr = data.xb_dk_time2
	} else if (data.xb_dk_time3) {
		endDateStr = data.xb_dk_time3
	}
	return { beginDateStr, endDateStr }
}

/*------------------------------公用方法-----------------------------*/

function formatDate(date) {
	let year = date.getFullYear()
	let month = padZero(date.getMonth() + 1)
	let day = padZero(date.getDate())
	let hours = padZero(date.getHours())
	let minutes = padZero(date.getMinutes())
	let seconds = padZero(date.getSeconds())

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 辅助函数：如果数字小于10，在前面补零
function padZero(num) {
	return num < 10 ? `0${num}` : num
}

getExtraWorkHour(2023, 9)
