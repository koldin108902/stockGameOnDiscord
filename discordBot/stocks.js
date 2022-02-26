const QuickChart = require('quickchart-js')
const Discord = require("discord.js")
const fs = require('fs')

async function showStockChart(msg) {
    const stocks = JSON.parse(fs.readFileSync("./data/stocks.json", "utf-8"))
    let stocks_min = []
    
    for (let i = 0; i < stocks.length; i++) {
        stocks_min.push({
            label: stocks[i].label,
            data: stocks[i].data.slice(stocks[i].data.length - 20),
            borderColor: stocks[i].borderColor,
            borderWidth: 1,
            fill: false
        })
    }

    const myChart = new QuickChart();
    myChart.setConfig({
        type: 'line',
        data: { labels: stocks[0].date.slice(stocks[0].date.length - 20), datasets: stocks_min },
        options: {
            display: true
        }
    }).setWidth(800).setHeight(400)
    msg.channel.send(await myChart.getShortUrl())
}

async function showStock(msg) {
    const stocks = JSON.parse(fs.readFileSync("./data/stocks.json", "utf-8"))
    let data = []
    
    for (let i = 0; i < stocks.length; i++) {
        const dataValue = stocks[i].data.slice(stocks[i].data.length - 2)
        let upDown
        if ((dataValue[1] - dataValue[0]) > 0) upDown = {simple:"+", emoji:"▲"}
        else if ((dataValue[1] - dataValue[0]) < 0) upDown = {simple:"-", emoji:"▼"}
        else upDown = {simple:"", emoji:""}
        
        data.push({
            name: stocks[i].label,
            value: `\`\`\`diff
${upDown.simple}   ${dataValue[1]}    ${upDown.emoji} ${Math.abs(dataValue[1] - dataValue[0])}
\`\`\``,
            inline: true
        })
    }
    
    let embed = new Discord.MessageEmbed().setTitle(`주식 현황 [${stocks[0].date.pop()}]`).setColor(0x00D8FF)
    for (let i = 0; i < data.length; i++) {
        embed.addFields(data[i])
    }
    msg.channel.send({embeds: [embed]})
}

function saleStock(cmd, msg) {
    if (cmd.length < 4) return msg.channel.send("잘못된 명령어입니다. ex)#주식 판매 삼성전자 10")
    
    const stocks = JSON.parse(fs.readFileSync('./data/stocks.json', "utf-8"))
    const user = JSON.parse(fs.readFileSync('./data/user.json', "utf-8"))
    let idx, stockId
    for (let i = 0; i < user.length; i++) {
        if(user[i].userId === msg.author.id) idx = i
    }
    
    if (typeof idx !== "number") return msg.channel.send("먼저 '#가입'을 통해 가입을 해주세요.")
    for (let i = 0; i < stocks.length; i++) {
        if (cmd[2] == stocks[i].label) {
            for(let j = 0; j < user[idx].stock.length; j++) {
                if (user[idx].stock[j].name == cmd[2]) {
                    stockId = j
                }
            }
            
            const count = Number(cmd[3])
            if(!user[idx].stock[stockId] || user[idx].stock[stockId].count < 1) return msg.channel.send("보유하지 않은 주식입니다.")
            if(user[idx].stock[stockId].count < count) return msg.channel.send(`보유한 주식보다 많은 양을 팔순 없습니다.\n보유주식량 ${user[idx].stock[stockId].count}`)
            
            if (typeof count !== "number") return msg.channel.send("잘못된 명령어 입니다. \n갯수가 잘 입렵되었는지 한번 더 확인해 주십시오.")
    
            for(let j = 0; j < user[idx].stock.length; j++) {
                if (user[idx].stock[j].name == stocks[i].label) {
                    user[idx].stock[j].count -= count
                    if (user[idx].stock[j].count < 1) user[idx].stock[j].principal = 0
                }
            }
            user[idx].coin += (Number(stocks[i].data[stocks[i].data.length - 1]) * count)
            
            fs.writeFileSync('./data/user.json', JSON.stringify(user))
            msg.channel.send(`${cmd[2]}의 주식을 ${cmd[3]}주 판매하였습니다 보유 자금은 \`${user[idx].coin}\`입니다.`)
            return
        }
    }
    
    msg.channel.send("잘못된 명령어 입니다. \n해당주식이 있는지, 숫자는 잘 입렵되었는지 한번 더 확인해 주십시오.")
}

function buyStock(cmd, msg) {
    if (cmd.length < 4) return msg.channel.send("잘못된 명령어입니다. ex)#주식 구매 삼성전자 10")
    
    const stocks = JSON.parse(fs.readFileSync('./data/stocks.json', "utf-8"))
    const user = JSON.parse(fs.readFileSync('./data/user.json', "utf-8"))
    let idx
    for (let i = 0; i < user.length; i++) {
        if(user[i].userId === msg.author.id) idx = i
    }
    
    if (typeof idx !== "number") return msg.channel.send("먼저 '#가입'을 통해 가입을 해주세요.")
    for (let i = 0; i < stocks.length; i++) {
        if (cmd[2] == stocks[i].label) {
            if(stocks[i].data[stocks[i].data.length - 1] < 1) return msg.channel.send("상장폐지된 주식입니다.")
            const count = Number(cmd[3])
            
            if (typeof count !== "number") return msg.channel.send("잘못된 명령어 입니다. \n갯수가 잘 입렵되었는지 한번 더 확인해 주십시오.")
            if (user[idx].coin < stocks[i].data[stocks[i].data.length - 1] * count) return msg.channel.send(`보유 금액이 부족합니다.
\`자본금: ${user[idx].coin}    필요금액: ${stocks[i].data[stocks[i].data.length - 1] * count - user[idx].coin}\``)
            const userCoin = user[idx].coin
            let isWork = false

            for(let j = 0; j < user[idx].stock.length; j++) {
                if (user[idx].stock[j].name == stocks[i].label) {
                    user[idx].stock[j].count += count
                    user[idx].stock[j].principal += (Number(stocks[i].data[stocks[i].data.length - 1]) * count)
                    isWork = true
                }
            }
            
            if (!isWork) {
                user[idx].stock.push({
                    name: stocks[i].label,
                    principal: (Number(stocks[i].data[stocks[i].data.length - 1]) * count),
                    count,
                })
            }
            
            user[idx].coin -= (Number(stocks[i].data[stocks[i].data.length - 1]) * count)
            
            fs.writeFileSync('./data/user.json', JSON.stringify(user))
            msg.channel.send(`${cmd[2]}의 주식을 ${cmd[3]}주 구입하여 \`${userCoin} - ${stocks[i].data.pop() * count}\`으로 보유 자금은 \`${user[idx].coin}\`입니다.  `)
            return
        }
    }
    
    msg.channel.send("잘못된 명령어 입니다. \n해당 주식이 있는지, 숫자는 잘 입력되었는지 한번 더 확인해 주십시오.")
}

function stockRoute(cmd, msg) {
    if (cmd.length < 2) return showStock(msg)
    if (cmd.length > 4) return msg.channel.send("잘못된 명령어 입니다. \n해당 주식이 있는지, 숫자는 잘 입력되었는지 한번 더 확인해 주십시오.")
    switch(cmd[1]) {
        case "구매":
            buyStock(cmd, msg)
            break
        case "판매":
            saleStock(cmd, msg)
            break
        case "차트":
            showStockChart(msg)
            break
    }
}

module.exports = stockRoute