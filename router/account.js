const fs = require("fs")
const Discord = require('discord.js')
const {numberToKorean} = require('../util/util')

function signUp(msg) {
    let user = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    for (let i = 0; i < user.length; i++) {
        if (user[i].userId == msg.author) return msg.channel.send("이미 가입이 완료된 계정입니다.")
    }

    user.push({
        userId: msg.author.id,
        userName: msg.author.tag,
        coin: 10000000,
        bank: 0,
        tax: 0,
        gambleTicket: 0,
        era: 3,
        stock: []
    })
    
    fs.writeFileSync("./data/user.json", JSON.stringify(user))
    msg.channel.send("가입이 성공적으로 완료되었습니다. \n기본급 1000만원이 지급됩니다.\n#설명서를 이용하여 명령어를 확인할 수 있습니다.")
}

function myAccount(msg) {
    let users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    let stocks = JSON.parse(fs.readFileSync("./data/stocks.json", 'utf-8'))
    let user, totalPorM = 0
    for (users of users) {
        if (typeof users !== "object") continue
        if (users.userId == msg.author) user = users
    }
    if (typeof user !== "object") return msg.channel.send("먼저 '#가입'을 통해 가입을 해주세요.")
    
    let embed = new Discord.MessageEmbed().setTitle(`${user.userName}주식 [${new Date().toLocaleTimeString()}]`)
    .setColor(0x00D8FF)
    for (let i = 0; i < user.stock.length; i++) {
        let stock
        for (let j = 0; j < stocks.length; j++) if (user.stock[i].name === stocks[j].label) stock = stocks[j]
        if (user.stock[i].count >= 1) {
            const PorM = (stock.data.pop() * user.stock[i].count) - user.stock[i].principal
            let upDown
            if(PorM < 0) upDown = {simple:"-", emoji:"▼"}
            else if(PorM > 0) upDown = {simple:"+", emoji:"▲"}
            else upDown = {simple:"", emoji:""}
            totalPorM += PorM
            embed.addFields({
                name: `> ${user.stock[i].name}`,
                value: `\`\`\`${numberToKorean(user.stock[i].count)}주\`\`\``,
                inline: true
            })
            embed.addFields({
                name: `손익`,
                inline: true,
                value: `\`\`\`diff
${upDown.simple} ${numberToKorean(Math.abs(PorM))}원
\`\`\``,
            })
            embed.addFields({
                name: `원가`,
                inline: true,
                value: `\`\`\`${numberToKorean((user.stock[i].principal / user.stock[i].count).toFixed(1))}원\`\`\``,
            })
        }
    }

    totalPorM = totalPorM > 0 ? numberToKorean(Math.abs(totalPorM)) : "- " + numberToKorean(Math.abs(totalPorM))
    
    embed.setDescription(`자본금 ${numberToKorean(user.coin)}원\n전체 손익 ${totalPorM}원\n도박 티켓 ${user.gambleTicket}장`)

    msg.channel.send({embeds: [embed]})
    msg.channel.send("긴급구제신청 가능 횟수: "+user.era)
}

function donate(cmd, msg) {
    if (msg.mentions.users.values().next().value === undefined) return msg.channel.send("멘션을 재확인 해주십시오.")
    const mention = msg.mentions.users.values().next().value.id || undefined
    const price = Number(cmd[2]) || ""
    let users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    
    if (typeof price !== "number" || price < 10000 || price % 1 !== 0) return msg.channel.send("송금액을 재확인 해주십시오. ex) #송금 유저멘션 송금액(최소 만원)")
    if (mention === undefined) return msg.channel.send("멘션을 재확인 해주십시오.")
    
    let commis = 0.07
    if (price > 500000 && price <= 10000000) commis = 0.03
    if (price > 10000000 && price <= 100000000) commis = 0.01 
    if (price > 100000000 && price <= 1000000000) commis = 0.001
    if (price > 1000000000) commis = 0
    
    const commission = Math.round(price * commis)
    
    for (let i = 0; i < users.length; i++) {
        if (users[i].userId === msg.author.id) {
            if (users[i].coin < price + commission) return msg.channel.send(`송금액이 자본금보다 많습니다. \n자본금 \`${users[i].coin}\` 수수료 \`${commission}\``)
            
            users[i].coin -= price + commission
            users[0].coin += commission
            for (let j = 0; j < users.length; j++) {
                if (users[j].userId == mention) {
                    users[j].coin += price
                    fs.writeFileSync('./data/user.json', JSON.stringify(users))
                    msg.channel.send(`${users[i].userName}님이 ${users[j].userName}님에게 \`${numberToKorean(price)}원\`을 송금하셨습니다.
\`${users[i].userName}\`님의 자본금은 이제 \`${numberToKorean(users[i].coin)}원\`이며 \`${users[j].userName}\`님의 자본금은 이제 \`${numberToKorean(users[j].coin)}원\`입니다.
수수료 ${commis}% \`${numberToKorean(commission)}원\`
`)
                    return
                }
            }
            return msg.channel.send("멘션한 유저가 가입되지 않은 유저이거나 없는 유저입니다.")
        }
    }    
    return msg.channel.send("#가입을 통해 가입을 먼저 해주십시오.")
}

function commissionList(msg) {
    msg.channel.send(`
수수료 가격표
\`\`\`
50만원이하: 7%
50만원 초과 ~ 1000만원 이하: 3%
1000만원 초과 ~ 1억 이하: 1%
1억 초과 ~ 10억 이하: 0.1%
10억 초과: 0%
\`\`\`
`)
}

function saveMoney(msg, cmd) {
    const users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    let idx = null
    
    for (let i = 0; i < users.length; i++) {
        if (msg.author.id === users[i].userId) {
            idx = i
            break
        }
    }
    
    if (users[idx].coin === null) users[idx].coin = 0
    if (users[idx].coin < cmd[2]) return msg.channel.send(`입금은 자본금인 [${numberToKorean(users[idx].coin)}]보다 많이 할 수 없습니다.`)
    
    users[idx].coin -= Number(cmd[2])
    users[idx].bank += Number(cmd[2])
    
    fs.writeFileSync("./data/user.json", JSON.stringify(users))
    msg.channel.send(`입금이 정상적으로 처리되었습니다.`)
}

function withDraw(msg, cmd) {
    const users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    let idx = null
    
    for (let i = 0; i < users.length; i++) {
        if (msg.author.id === users[i].userId) {
            idx = i
            break
        }
    }
    if (idx === null) return msg.channel.send("[#가입]을 먼저 진행해 주십시오.")
    if (cmd[2] == "다") cmd[2] = users[idx].bank
    cmd[2] = Number(cmd[2]) || false
    if (!cmd[2]) return msg.channel.send("정상적인 값을 입력해 주십시오.")
    if (users[idx].bank < Number(cmd[2])) return msg.channel.send(`출금은 입금된 잔고인 [${numberToKorean(users[idx].coin)}]원보다 많이 할 수 없습니다.`)
    
    users[idx].coin += Number(cmd[2])
    users[idx].bank -= Number(cmd[2])
    
    fs.writeFileSync("./data/user.json", JSON.stringify(users))
    msg.channel.send(`출금이 정상적으로 처리되었습니다.`)
}

function showBankMoney(msg) {
    const users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    let idx = null,
        creditRating = 0
    
    for (let i = 0; i < users.length; i++) {
        if (msg.author.id === users[i].userId) {
            idx = i
            break
        }
    }
    
    if (idx === null) return msg.channel.send("[#가입]을 먼저 진행해 주십시오.")
    if (users[idx].tax >= 100000000000000000n) creditRating = 10
    else if (users[idx].tax >= 10000000000000000n) creditRating = 9
    else if (users[idx].tax >= 1000000000000000) creditRating = 8
    else if (users[idx].tax >= 100000000000000) creditRating = 7
    else if (users[idx].tax >= 10000000000000) creditRating = 6
    else if (users[idx].tax >= 1000000000000) creditRating = 5
    else if (users[idx].tax >= 100000000000) creditRating = 4
    else if (users[idx].tax >= 10000000000) creditRating = 3
    else if (users[idx].tax >= 1000000000) creditRating = 2
    else if (users[idx].tax >= 100000000) creditRating = 1
    else creditRating = 0
    
    msg.channel.send(`고객님의 은행 잔고는 ${numberToKorean(users[idx].bank)}원 입니다.
신용 등급 [${creditRating}]단계    연속 세금 ${numberToKorean(users[idx].tax)}원 
`)
}

function loan(msg, cmd) {
    const users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    let idx = null,
    creditRating = 0,
    //기본 대출 가능 금핵 천만원
    loanLimit = 10000000
    
    for (let i = 0; i < users.length; i++) {
        if (msg.author.id === users[i].userId) {
            idx = i
            break
        }
    }
    
    if (idx === null) return msg.channel.send("[#가입]을 먼저 진행해 주십시오.")
    if (users[idx].tax >= 100000000000000000n) creditRating = 10
    else if (users[idx].tax >= 10000000000000000n) creditRating = 9
    else if (users[idx].tax >= 1000000000000000) creditRating = 8
    else if (users[idx].tax >= 100000000000000) creditRating = 7
    else if (users[idx].tax >= 10000000000000) creditRating = 6
    else if (users[idx].tax >= 1000000000000) creditRating = 5
    else if (users[idx].tax >= 100000000000) creditRating = 4
    else if (users[idx].tax >= 10000000000) creditRating = 3
    else if (users[idx].tax >= 1000000000) creditRating = 2
    else if (users[idx].tax >= 100000000) creditRating = 1
    else creditRating = 0
    
    if (users[idx].coin !== 0 || users[idx].bank !== 0) return msg.channel.send("대출을 받으실 수 없습니다.")
    
    const loanAmount = users[idx].tax + Math.ceil(users[idx].tax * (creditRating / 10))
    users[idx].coin += loanAmount
    users[idx].tax = 0

    fs.writeFileSync("./data/user.json", JSON.stringify(users))

    msg.channel.send(`대출을 성공적으로 받았습니다. 대출금 ${numberToKorean(loanAmount)}원
자본금 ${numberToKorean(users[idx].coin)}    신용등급 ${creditRating}
`)
}

function giveTax(msg, cmd) {
    const users = JSON.parse(fs.readFileSync("./data/user.json", 'utf-8'))
    
    for (let i = 0; i < users.length; i++) {
        if (users[i].userId !== msg.author.id) continue

        if (cmd[2] < 1 || !Number(cmd[2])) return msg.channel.send(`명령어를 다시 한번 확인해 주십시오.`)
        if (users[i].coin < Number(cmd[2])) return msg.channel.send(`자본금을 초과하는 금액은 사용할 수 없습니다.`)
        users[i].coin -= Number(cmd[2])
        users[i].tax += Number(cmd[2])
    }
    
    msg.channel.send(`성공적으로 납부되셨습니다. [#은행 통장]을 통해 확인해 주십시오.`)
    fs.writeFileSync("./data/user.json", JSON.stringify(users))
}

module.exports = (cmd, msg) => {
    if (cmd[0] === "송금" && cmd.length < 2) return commissionList(msg)
    
    switch(cmd[0]) {
        case "가입":
            signUp(msg)
        break
        case "ㄴ":
            myAccount(msg)
        break
        case "송금":
            donate(cmd, msg)
        break
    }
    if (cmd[0] === "은행") {
        switch(cmd[1]) {
            case "입금":
                saveMoney(msg, cmd)
                break
            case "출금":
                withDraw(msg, cmd)
                break
            case "통장":
                showBankMoney(msg)
                break
            case "대출":
                loan(msg, cmd)
                break
            case "납부":
                giveTax(msg, cmd)
                break
            case "한도":
                msg.channel.send(`\`\`\`
대출 한도입니다.
원금 + (신용 등급 * 10)% 
\`\`\`
`)
            
        }
    }
}