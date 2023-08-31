function getCurUser() {
    return new Promise((resolve, reject) => {
        // 发送 POST 请求以获取当前用户信息
        fetch('https://ehr.supcon.com/RedseaPlatform/PtUsers.mc?method=getCurUserInfo', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            resolve(data.staffId);
        })
        .catch(error => {
            console.error('Error fetching current user:', error);
            reject(error);
        });
    });
}

async function getExtraWorkHour(year, month) {
    try {
        var staffId = await getCurUser();
        
        // 获取这个月总共有多少天
        var endCount = getDays(year, month);
        var totalExtraHour = 0;
        
        // 月份小于0时，需要在月份前加上0。例如1月改成01月
        month = month < 10 ? "0" + month : month;

        for (var i = 1; i <= endCount; i++) {
            // 日小于0时，需要在日前加上0。例如1日改成01日
            var hour = await getDayHour(staffId, i < 10 ? year + "-" + month + "-0" + i : year + "-" + month + "-" + i);

            if (hour) {
                totalExtraHour += hour;
            }
        }

        console.log("加班总时间：" + totalExtraHour);
    } catch (error) {
        console.error('Error getting extra work hour:', error);
    }
}

function getDays(year, month) {
	// 数组从0开始
	month=month-1;
	let days = [31,28,31,30,31,30,31,31,30,31,30,31] 
	// 处理闰年
	if ( (year % 4 ===0) && (year % 100 !==0 || year % 400 ===0) ) {
		days[1] = 29
	}
	return days[month]  
}

function getDayHour(staffId,day){
	var extraHour=0;
	$.ajax({
		url: "https://ehr.supcon.com/RedseaPlatform/getList/kq_count_SelectStaffIDDaily/CoreRequest.mc?staff_id="+staffId+"&work_day="+day,
		type: 'post',
		async: false,
		contentType: "application/x-www-form-urlencoded",
		success: function (res) {
			var data=res.result['#result-set-1'][0];
			if(data.datetypename=="工作日"){
				var beginDateStr,endDateStr;
				if(data.sb_dk_time){
					beginDateStr=data.sb_dk_time
				}else if(data.sb_dk_time2){
					beginDateStr=data.sb_dk_time2
				}else if(data.sb_dk_time3){
					beginDateStr=data.sb_dk_time3
				}
				if(data.xb_dk_time){
					endDateStr=data.xb_dk_time
				}else if(data.xb_dk_time2){
					endDateStr=data.xb_dk_time2
				}else if(data.xb_dk_time3){
					endDateStr=data.xb_dk_time3
				}
				// 8点前不算上班
				if(beginDateStr<(day+" 08:00:00")){
					beginDateStr=day+" 08:00:00";
				}
				// 上班时间9小时，吃饭时间半小时
				var beginDate=new Date(new Date(beginDateStr).getTime()+9.5*3600*1000)
				var endDate=new Date(endDateStr)
				extraHour=(endDate-beginDate)/3600/1000;
				// 处理加班时间小于0.5小时的情况
				if(extraHour<0.5){
					extraHour=0;
				}
			}else{
				var beginDateStr,endDateStr;
				if(data.sb_dk_time){
					beginDateStr=data.sb_dk_time
				}else if(data.sb_dk_time2){
					beginDateStr=data.sb_dk_time2
				}else if(data.sb_dk_time3){
					beginDateStr=data.sb_dk_time3
				}
				if(data.xb_dk_time){
					endDateStr=data.xb_dk_time
				}else if(data.xb_dk_time2){
					endDateStr=data.xb_dk_time2
				}else if(data.xb_dk_time3){
					endDateStr=data.xb_dk_time3
				}
				var beginDate=new Date(beginDateStr)
				var endDate=new Date(endDateStr)
				extraHour=(endDate-beginDate)/3600/1000;
			}
			if(extraHour>0){
				console.log(day+" "+data.datetypename+" : "+extraHour)
			}
		}
	});
	return extraHour;
}


getExtraWorkHour(2023,8)
