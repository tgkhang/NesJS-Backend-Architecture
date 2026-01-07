interface TeamProduce {
  produceCar(): void
  makeCar(): void
}

class TeamCarVF2 implements TeamProduce {
  produceCar() {
    console.log('Producing TeamCar VF2')
  }

  makeCar() {
    this.produceCar()
  }
}

class TeamCarVF1 implements TeamProduce {
  produceCar() {
    console.log('Producing TeamCar VF1')
  }
  makeCar() {
    this.produceCar()
  }
}

class TeamLead {
  private teamProduce: TeamProduce
  constructor(teamProduce: TeamProduce) {
    this.teamProduce = teamProduce
  }

  task() {
    this.teamProduce.makeCar()
  }
}


class TeamCompany {
  start() {
    const teamProduce = new TeamCarVF2()
    const teamLead = new TeamLead(teamProduce)
    teamLead.task()
  }
}

const teamCompany = new TeamCompany()
teamCompany.start()