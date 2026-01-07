// vd ve IOC

class TeamCarVF8 {
  produceCar() {
    console.log('Producing TeamCar VF8')
  }
}

class TeamCarVF5 {
  produceCar() {
    console.log('Producing TeamCar VF5')
  }
}

class TeamLead {
  private teamCarVF8: TeamCarVF8 = new TeamCarVF8()
  // private teamCarVF5: TeamCarVF5 = new TeamCarVF5()
  task() {
    this.teamCarVF8.produceCar()
  }
}

class TeamCompany {
  // start
  start() {
    const teamLead = new TeamLead()
    teamLead.task()
  }
}

const teamCompany = new TeamCompany()
teamCompany.start()
